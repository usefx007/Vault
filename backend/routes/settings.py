import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status, Depends, Response
from backend.database import get_db
from backend.models import (
    UpdateNameRequest, RequestEmailChange, ChangePasswordRequest,
    UpdatePreferences, DeleteAccountRequest
)
from backend.crypto import hash_password, verify_password, generate_token
from backend.security import get_current_user_and_session

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.put("/profile")
async def update_profile(data: UpdateNameRequest, user_and_session: dict = Depends(get_current_user_and_session)):
    user_id = user_and_session["user_id"]
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        conn.execute("UPDATE users SET name = ?, updated_at = ? WHERE id = ?", (data.name.strip(), now_iso, user_id))

    return {"message": "Profile updated successfully", "name": data.name.strip()}

@router.post("/request-email-change")
async def request_email_change(data: RequestEmailChange, user_and_session: dict = Depends(get_current_user_and_session)):
    user_id = user_and_session["user_id"]
    new_email = data.new_email.lower().strip()
    current_email = user_and_session["email"]

    if new_email == current_email:
        raise HTTPException(status_code=400, detail="New email must be different from current email.")

    now_iso = datetime.now(timezone.utc).isoformat()
    expires_iso = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    token = generate_token()

    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (new_email,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="This email is already associated with another account.")

        token_id = f"tok_{uuid.uuid4().hex[:16]}"
        conn.execute("""
            INSERT INTO auth_tokens (id, user_id, token, token_type, new_email, created_at, expires_at)
            VALUES (?, ?, ?, 'email_change', ?, ?, ?)
        """, (token_id, user_id, token, new_email, now_iso, expires_iso))

    return {
        "message": f"Confirmation link sent to {new_email}. Please check your inbox.",
        "confirmation_token": token  # For easy test/dev verification
    }

@router.post("/confirm-email-change")
async def confirm_email_change(data: dict, user_and_session: dict = Depends(get_current_user_and_session)):
    user_id = user_and_session["user_id"]
    token = data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Confirmation token is required")

    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        row = conn.execute("""
            SELECT id, new_email, expires_at, used_at
            FROM auth_tokens
            WHERE token = ? AND user_id = ? AND token_type = 'email_change'
        """, (token, user_id)).fetchone()

        if not row or row["used_at"] is not None:
            raise HTTPException(status_code=400, detail="Invalid or already used confirmation token.")

        if row["expires_at"] < now_iso:
            raise HTTPException(status_code=400, detail="Confirmation token has expired.")

        new_email = row["new_email"]
        conn.execute("UPDATE users SET email = ?, updated_at = ? WHERE id = ?", (new_email, now_iso, user_id))
        conn.execute("UPDATE auth_tokens SET used_at = ? WHERE id = ?", (now_iso, row["id"]))

    return {"message": "Email address updated successfully.", "email": new_email}

@router.post("/change-password")
async def change_password(data: ChangePasswordRequest, user_and_session: dict = Depends(get_current_user_and_session)):
    user_id = user_and_session["user_id"]
    current_sid = user_and_session["session_id"]

    if user_and_session["auth_provider"] == "google":
        raise HTTPException(
            status_code=400,
            detail="Google-only accounts do not support local password change."
        )

    if data.new_password != data.confirm_new_password:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match.")

    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password cannot be the same as your current password.")

    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        user_row = conn.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user_row or not verify_password(data.current_password, user_row["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")

        new_hash = hash_password(data.new_password)
        conn.execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", (new_hash, now_iso, user_id))

        # Revoke all other sessions for security
        conn.execute(
            "UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at IS NULL",
            (now_iso, user_id, current_sid)
        )

    return {"message": "Password changed successfully. Other devices have been logged out."}

@router.put("/preferences")
async def update_preferences(data: UpdatePreferences, user_and_session: dict = Depends(get_current_user_and_session)):
    user_id = user_and_session["user_id"]
    updates = []
    params = []

    if data.view_preference is not None:
        updates.append("view_preference = ?")
        params.append(data.view_preference)

    if data.sort_preference is not None:
        updates.append("sort_preference = ?")
        params.append(data.sort_preference)

    if data.language is not None:
        updates.append("language = ?")
        params.append(data.language)

    if data.theme is not None:
        updates.append("theme = ?")
        params.append(data.theme)

    if updates:
        now_iso = datetime.now(timezone.utc).isoformat()
        updates.append("updated_at = ?")
        params.append(now_iso)
        params.append(user_id)
        with get_db() as conn:
            conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)

    return {"message": "Preferences updated successfully"}

@router.post("/delete-account")
async def delete_account(
    data: DeleteAccountRequest,
    response: Response,
    user_and_session: dict = Depends(get_current_user_and_session)
):
    if data.confirmation.strip() != "DELETE":
        raise HTTPException(status_code=400, detail="You must type 'DELETE' exactly to confirm permanent account deletion.")

    user_id = user_and_session["user_id"]

    # Permanent cascading deletion
    with get_db() as conn:
        conn.execute("DELETE FROM vault_entries WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM categories WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM auth_tokens WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))

    response.delete_cookie("session_id")
    return {"message": "Your account and all associated data have been permanently deleted."}
