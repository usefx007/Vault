from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends, Response
from backend.database import get_db
from backend.security import get_current_user_and_session

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.get("")
async def list_active_sessions(user_and_session: dict = Depends(get_current_user_and_session)):
    user_id = user_and_session["user_id"]
    current_sid = user_and_session["session_id"]

    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, device_type, browser, os, ip_address, approx_location,
                   created_at, last_active
            FROM sessions
            WHERE user_id = ? AND revoked_at IS NULL
            ORDER BY last_active DESC
        """, (user_id,)).fetchall()

    sessions = []
    for r in rows:
        sessions.append({
            "id": r["id"],
            "device_type": r["device_type"],
            "browser": r["browser"],
            "os": r["os"],
            "ip_address": r["ip_address"],
            "approx_location": r["approx_location"],
            "login_date": r["created_at"],
            "last_active": r["last_active"],
            "is_current": (r["id"] == current_sid)
        })

    return {"sessions": sessions, "total": len(sessions)}

@router.post("/{session_id}/revoke")
async def revoke_session(
    session_id: str,
    response: Response,
    user_and_session: dict = Depends(get_current_user_and_session)
):
    user_id = user_and_session["user_id"]
    current_sid = user_and_session["session_id"]
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM sessions WHERE id = ? AND user_id = ? AND revoked_at IS NULL",
            (session_id, user_id)
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Session not found or already revoked")

        conn.execute("UPDATE sessions SET revoked_at = ? WHERE id = ?", (now_iso, session_id))

    if session_id == current_sid:
        response.delete_cookie("session_id")
        return {"message": "Current session revoked. You have been logged out.", "logged_out": True}

    return {"message": "Session revoked successfully.", "logged_out": False}

@router.post("/revoke-all")
async def revoke_all_sessions(
    response: Response,
    include_current: bool = False,
    user_and_session: dict = Depends(get_current_user_and_session)
):
    user_id = user_and_session["user_id"]
    current_sid = user_and_session["session_id"]
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        if include_current:
            conn.execute("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL", (now_iso, user_id))
            response.delete_cookie("session_id")
            return {"message": "All sessions revoked. You have been logged out.", "logged_out": True}
        else:
            conn.execute(
                "UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at IS NULL",
                (now_iso, user_id, current_sid)
            )
            return {"message": "All other device sessions revoked successfully.", "logged_out": False}
