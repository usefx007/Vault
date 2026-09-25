import uuid
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status, Request, Response, Depends
from backend.database import get_db
from backend.models import (
    UserRegister, UserLogin, GoogleLoginRequest,
    ForgotPasswordRequest, ResetPasswordRequest
)
from backend.crypto import hash_password, verify_password, generate_session_id, generate_token
from backend.security import (
    limiter, get_client_ip, parse_user_agent, get_approx_location,
    get_current_user_and_session
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
async def register(req: UserRegister, request: Request):
    ip = get_client_ip(request)
    if not limiter.check(f"register_{ip}", max_requests=10, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many registration attempts. Please wait a minute.")

    email = req.email.lower()
    now_iso = datetime.now(timezone.utc).isoformat()
    expires_iso = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    verification_token = generate_token()

    with get_db() as conn:
        existing = conn.execute("SELECT id, is_verified FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            # Prevent account enumeration: return success response
            return {
                "message": "Registration successful. Please check your email to verify your account.",
                "verification_sent": True
            }

        user_id = f"usr_{uuid.uuid4().hex[:16]}"
        pw_hash = hash_password(req.password)

        conn.execute("""
            INSERT INTO users (id, email, name, password_hash, auth_provider, is_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'local', 0, ?, ?)
        """, (user_id, email, req.name, pw_hash, now_iso, now_iso))

        token_id = f"tok_{uuid.uuid4().hex[:16]}"
        conn.execute("""
            INSERT INTO auth_tokens (id, user_id, token, token_type, created_at, expires_at)
            VALUES (?, ?, ?, 'email_verification', ?, ?)
        """, (token_id, user_id, verification_token, now_iso, expires_iso))

    return {
        "message": "Registration successful. Please verify your email address.",
        "verification_token": verification_token  # Provided for easy verification in test/dev
    }

@router.post("/verify-email")
async def verify_email(data: dict):
    token = data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Verification token is required")

    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        token_row = conn.execute("""
            SELECT id, user_id, expires_at, used_at
            FROM auth_tokens
            WHERE token = ? AND token_type = 'email_verification'
        """, (token,)).fetchone()

        if not token_row or token_row["used_at"] is not None:
            raise HTTPException(status_code=400, detail="Invalid or expired verification token")

        if token_row["expires_at"] < now_iso:
            raise HTTPException(status_code=400, detail="Verification token has expired")

        conn.execute("UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?", (now_iso, token_row["user_id"]))
        conn.execute("UPDATE auth_tokens SET used_at = ? WHERE id = ?", (now_iso, token_row["id"]))

    return {"message": "Email address verified successfully. You may now log in."}

@router.post("/login")
async def login(req: UserLogin, request: Request, response: Response):
    ip = get_client_ip(request)
    email = req.email.lower()
    if not limiter.check(f"login_{ip}_{email}", max_requests=10, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many login attempts. Please wait a minute.")

    with get_db() as conn:
        user_row = conn.execute("""
            SELECT id, email, name, password_hash, auth_provider, is_verified,
                   view_preference, sort_preference, language, theme
            FROM users WHERE email = ?
        """, (email,)).fetchone()

        if not user_row or user_row["auth_provider"] == "google" or not user_row["password_hash"]:
            # Dummy verify to equalize timing
            verify_password("dummy_password", "scrypt$32768$8$1$c2FsdHNhbHQ=$a2V5a2V5")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not verify_password(req.password, user_row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not user_row["is_verified"]:
            raise HTTPException(
                status_code=403,
                detail="Email verification is required before logging in. Please check your email."
            )

        # Create session
        session_id = generate_session_id()
        ua = request.headers.get("user-agent", "")
        device, browser, os_name = parse_user_agent(ua)
        approx_loc = get_approx_location(ip)
        now_iso = datetime.now(timezone.utc).isoformat()

        conn.execute("""
            INSERT INTO sessions (id, user_id, device_type, browser, os, ip_address, approx_location, created_at, last_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (session_id, user_row["id"], device, browser, os_name, ip, approx_loc, now_iso, now_iso))

    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production HTTPS
        max_age=30 * 24 * 3600
    )

    user_dict = dict(user_row)
    del user_dict["password_hash"]
    return {
        "message": "Login successful",
        "user": {**user_dict, "is_verified": bool(user_dict["is_verified"])},
        "session_id": session_id
    }

@router.post("/google")
async def google_login(req: GoogleLoginRequest, request: Request, response: Response):
    ip = get_client_ip(request)
    email = req.email.lower()
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        user_row = conn.execute("""
            SELECT id, email, name, auth_provider, is_verified,
                   view_preference, sort_preference, language, theme
            FROM users WHERE email = ?
        """, (email,)).fetchone()

        if user_row:
            if user_row["auth_provider"] != "google":
                raise HTTPException(
                    status_code=400,
                    detail="This email was registered with Email + Password. Please log in using your password."
                )
            user_id = user_row["id"]
        else:
            # Create Google user
            user_id = f"usr_{uuid.uuid4().hex[:16]}"
            conn.execute("""
                INSERT INTO users (id, email, name, password_hash, auth_provider, is_verified, created_at, updated_at)
                VALUES (?, ?, ?, NULL, 'google', 1, ?, ?)
            """, (user_id, email, req.name or "Google User", now_iso, now_iso))

        # Create session
        session_id = generate_session_id()
        ua = request.headers.get("user-agent", "")
        device, browser, os_name = parse_user_agent(ua)
        approx_loc = get_approx_location(ip)

        conn.execute("""
            INSERT INTO sessions (id, user_id, device_type, browser, os, ip_address, approx_location, created_at, last_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (session_id, user_id, device, browser, os_name, ip, approx_loc, now_iso, now_iso))

        updated_user = conn.execute("""
            SELECT id, email, name, auth_provider, is_verified,
                   view_preference, sort_preference, language, theme
            FROM users WHERE id = ?
        """, (user_id,)).fetchone()

    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=30 * 24 * 3600
    )

    return {
        "message": "Google authentication successful",
        "user": {**dict(updated_user), "is_verified": bool(updated_user["is_verified"])},
        "session_id": session_id
    }

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, request: Request):
    ip = get_client_ip(request)
    if not limiter.check(f"forgot_{ip}", max_requests=5, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many reset requests. Please wait a minute.")

    email = req.email.lower()
    now_iso = datetime.now(timezone.utc).isoformat()
    expires_iso = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    reset_token = None

    with get_db() as conn:
        user_row = conn.execute("SELECT id, auth_provider FROM users WHERE email = ?", (email,)).fetchone()
        if user_row and user_row["auth_provider"] == "local":
            reset_token = generate_token()
            token_id = f"tok_{uuid.uuid4().hex[:16]}"
            conn.execute("""
                INSERT INTO auth_tokens (id, user_id, token, token_type, created_at, expires_at)
                VALUES (?, ?, ?, 'password_reset', ?, ?)
            """, (token_id, user_row["id"], reset_token, now_iso, expires_iso))

    res = {"message": "If an account with that email exists, password reset instructions have been sent."}
    if reset_token:
        res["reset_token"] = reset_token  # For dev/test verification
    return res

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        token_row = conn.execute("""
            SELECT id, user_id, expires_at, used_at
            FROM auth_tokens
            WHERE token = ? AND token_type = 'password_reset'
        """, (req.token,)).fetchone()

        if not token_row or token_row["used_at"] is not None:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        if token_row["expires_at"] < now_iso:
            raise HTTPException(status_code=400, detail="Reset token has expired")

        user_row = conn.execute("SELECT id, auth_provider FROM users WHERE id = ?", (token_row["user_id"],)).fetchone()
        if not user_row or user_row["auth_provider"] != "local":
            raise HTTPException(status_code=400, detail="Password reset is not permitted for this account type")

        pw_hash = hash_password(req.new_password)
        conn.execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", (pw_hash, now_iso, user_row["id"]))
        conn.execute("UPDATE auth_tokens SET used_at = ? WHERE id = ?", (now_iso, token_row["id"]))

        # Invalidate all active sessions for security
        conn.execute("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL", (now_iso, user_row["id"]))

    return {"message": "Password has been successfully reset. Please log in with your new password."}

@router.post("/logout")
async def logout(response: Response, user_and_session: dict = Depends(get_current_user_and_session)):
    session_id = user_and_session["session_id"]
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute("UPDATE sessions SET revoked_at = ? WHERE id = ?", (now_iso, session_id))

    response.delete_cookie("session_id")
    return {"message": "Logged out successfully"}

@router.get("/me")
async def get_me(user_and_session: dict = Depends(get_current_user_and_session)):
    return {
        "id": user_and_session["user_id"],
        "email": user_and_session["email"],
        "name": user_and_session["name"],
        "auth_provider": user_and_session["auth_provider"],
        "is_verified": bool(user_and_session["is_verified"]),
        "view_preference": user_and_session["view_preference"],
        "sort_preference": user_and_session["sort_preference"],
        "language": user_and_session["language"],
        "theme": user_and_session["theme"],
        "current_session_id": user_and_session["session_id"]
    }
