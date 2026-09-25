from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from backend.database import get_db
from backend.security import require_verified_user

router = APIRouter(prefix="/api/trash", tags=["trash"])

def purge_expired_trash():
    """Server-side permanent deletion of entries older than 7 days in trash."""
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    with get_db() as conn:
        conn.execute("DELETE FROM vault_entries WHERE deleted_at IS NOT NULL AND deleted_at < ?", (seven_days_ago,))

@router.get("")
async def list_trash(user: dict = Depends(require_verified_user)):
    purge_expired_trash()
    user_id = user["user_id"]
    now = datetime.now(timezone.utc)

    with get_db() as conn:
        rows = conn.execute("""
            SELECT v.id, v.name, v.url, v.username, v.deleted_at, c.name as category_name
            FROM vault_entries v
            LEFT JOIN categories c ON v.category_id = c.id
            WHERE v.user_id = ? AND v.deleted_at IS NOT NULL
            ORDER BY v.deleted_at DESC
        """, (user_id,)).fetchall()

    items = []
    for r in rows:
        del_at_str = r["deleted_at"]
        try:
            del_at = datetime.fromisoformat(del_at_str)
            # Ensure timezone-aware for math
            if del_at.tzinfo is None:
                del_at = del_at.replace(tzinfo=timezone.utc)
            age = now - del_at
            days_left = max(0, 7 - age.days)
        except Exception:
            days_left = 7

        items.append({
            "id": r["id"],
            "name": r["name"],
            "url": r["url"],
            "username": r["username"],
            "category_name": r["category_name"] or "Uncategorized",
            "deleted_at": r["deleted_at"],
            "days_remaining": days_left
        })

    return {"trash": items, "total": len(items)}

@router.post("/{entry_id}/restore")
async def restore_trash_entry(entry_id: str, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM vault_entries WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL",
            (entry_id, user_id)
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Trash entry not found")

        conn.execute(
            "UPDATE vault_entries SET deleted_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?",
            (now_iso, entry_id, user_id)
        )

    return {"message": "Entry restored successfully to Vault"}

@router.delete("/{entry_id}")
async def permanently_delete_trash_entry(entry_id: str, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM vault_entries WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL",
            (entry_id, user_id)
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Trash entry not found")

        conn.execute("DELETE FROM vault_entries WHERE id = ? AND user_id = ?", (entry_id, user_id))

    return {"message": "Entry permanently deleted"}

@router.post("/empty")
async def empty_trash(user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    with get_db() as conn:
        conn.execute("DELETE FROM vault_entries WHERE user_id = ? AND deleted_at IS NOT NULL", (user_id,))

    return {"message": "Trash emptied successfully"}
