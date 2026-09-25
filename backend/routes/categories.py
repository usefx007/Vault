import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from backend.database import get_db
from backend.models import CategoryCreate, CategoryUpdate
from backend.security import require_verified_user

router = APIRouter(prefix="/api/categories", tags=["categories"])

@router.get("")
async def list_categories(user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    with get_db() as conn:
        rows = conn.execute("""
            SELECT c.id, c.name, c.is_system, c.user_id,
                   COUNT(CASE WHEN v.deleted_at IS NULL AND v.user_id = ? THEN 1 END) as entry_count
            FROM categories c
            LEFT JOIN vault_entries v ON v.category_id = c.id AND v.user_id = ?
            WHERE c.user_id IS NULL OR c.user_id = ?
            GROUP BY c.id, c.name, c.is_system, c.user_id
            ORDER BY c.is_system DESC, LOWER(c.name) ASC
        """, (user_id, user_id, user_id)).fetchall()

    return {
        "categories": [
            {
                "id": r["id"],
                "name": r["name"],
                "is_system": bool(r["is_system"]),
                "entry_count": r["entry_count"]
            }
            for r in rows
        ]
    }

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(data: CategoryCreate, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    cat_name = data.name.strip()
    now_iso = datetime.now(timezone.utc).isoformat()
    cat_id = f"cat_{uuid.uuid4().hex[:16]}"

    with get_db() as conn:
        # Check duplicate for this user
        existing = conn.execute(
            "SELECT id FROM categories WHERE (user_id = ? OR user_id IS NULL) AND LOWER(name) = LOWER(?)",
            (user_id, cat_name)
        ).fetchone()

        if existing:
            raise HTTPException(status_code=400, detail="Category with this name already exists")

        conn.execute("""
            INSERT INTO categories (id, user_id, name, is_system, created_at)
            VALUES (?, ?, ?, 0, ?)
        """, (cat_id, user_id, cat_name, now_iso))

    return {
        "id": cat_id,
        "name": cat_name,
        "is_system": False,
        "entry_count": 0
    }

@router.put("/{category_id}")
async def update_category(category_id: str, data: CategoryUpdate, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    cat_name = data.name.strip()

    with get_db() as conn:
        row = conn.execute("SELECT id, is_system, user_id FROM categories WHERE id = ?", (category_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Category not found")

        if row["is_system"] == 1 or row["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Cannot modify system or unauthorized category")

        # Check duplicate
        existing = conn.execute(
            "SELECT id FROM categories WHERE (user_id = ? OR user_id IS NULL) AND LOWER(name) = LOWER(?) AND id != ?",
            (user_id, cat_name, category_id)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Category with this name already exists")

        conn.execute("UPDATE categories SET name = ? WHERE id = ? AND user_id = ?", (cat_name, category_id, user_id))

    return {"id": category_id, "name": cat_name, "is_system": False}

@router.delete("/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    with get_db() as conn:
        row = conn.execute("SELECT id, is_system, user_id FROM categories WHERE id = ?", (category_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Category not found")

        if row["is_system"] == 1 or row["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Cannot delete system or unauthorized category")

        # Safely reassign associated entries to NULL (Uncategorized) so no password entries are destroyed
        conn.execute("UPDATE vault_entries SET category_id = NULL WHERE user_id = ? AND category_id = ?", (user_id, category_id))
        conn.execute("DELETE FROM categories WHERE id = ? AND user_id = ?", (category_id, user_id))

    return {"message": "Category deleted. Associated entries have been safely preserved as Uncategorized."}
