import time
from typing import Dict, Tuple, Optional
from collections import defaultdict
from fastapi import Request, HTTPException, status, Depends
from datetime import datetime, timezone
from backend.database import get_db

# Thread-safe in-memory rate limiter
class RateLimiter:
    def __init__(self):
        # key -> list of timestamps
        self.requests: Dict[str, list] = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        timestamps = self.requests[key]
        # Remove expired
        self.requests[key] = [t for t in timestamps if now - t < window_seconds]
        if len(self.requests[key]) >= max_requests:
            return False
        self.requests[key].append(now)
        return True

limiter = RateLimiter()

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "127.0.0.1"

def parse_user_agent(ua_string: str) -> Tuple[str, str, str]:
    if not ua_string:
        return ("Desktop", "Unknown Browser", "Unknown OS")
    ua = ua_string.lower()

    # Device
    if "ipad" in ua or "tablet" in ua:
        device = "Tablet"
    elif "mobi" in ua or "iphone" in ua or "android" in ua:
        device = "Mobile"
    else:
        device = "Desktop"

    # Browser
    if "edg" in ua:
        browser = "Edge"
    elif "chrome" in ua and "safari" in ua and "edg" not in ua:
        browser = "Chrome"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"
    elif "opera" in ua or "opr" in ua:
        browser = "Opera"
    else:
        browser = "Browser"

    # OS
    if "windows" in ua:
        os_name = "Windows"
    elif "macintosh" in ua or "mac os" in ua:
        os_name = "macOS"
    elif "iphone" in ua or "ipad" in ua:
        os_name = "iOS"
    elif "android" in ua:
        os_name = "Android"
    elif "linux" in ua:
        os_name = "Linux"
    else:
        os_name = "Unknown OS"

    return (device, browser, os_name)

def get_approx_location(ip: str) -> str:
    if ip in ("127.0.0.1", "localhost", "::1") or ip.startswith("192.168.") or ip.startswith("10."):
        return "Local Network"
    return "Secured Region"

async def get_current_user_and_session(request: Request):
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        session_id = auth_header.split(" ")[1].strip()
    else:
        session_id = request.cookies.get("session_id")

    if not session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    with get_db() as conn:
        row = conn.execute("""
            SELECT s.id as session_id, s.user_id, s.device_type, s.browser, s.os, s.ip_address,
                   s.approx_location, s.created_at as session_created_at, s.last_active, s.revoked_at,
                   u.id as user_id, u.email, u.name, u.auth_provider, u.is_verified,
                   u.view_preference, u.sort_preference, u.language, u.theme
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ? AND s.revoked_at IS NULL
        """, (session_id,)).fetchone()

        if not row:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")

        # Update last active asynchronously / periodically
        now_iso = datetime.now(timezone.utc).isoformat()
        conn.execute("UPDATE sessions SET last_active = ? WHERE id = ?", (now_iso, session_id))

        user_data = dict(row)
        return user_data

def require_verified_user(user: dict = Depends(get_current_user_and_session)):
    if not user.get("is_verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address must be verified to perform this action."
        )
    return user
