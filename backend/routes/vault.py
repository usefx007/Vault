import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, Query
from backend.database import get_db
from backend.models import (
    VaultEntryCreate, VaultEntryUpdate, VaultEntryMoveCategory, VaultOrderUpdate
)
from backend.crypto import encrypt_vault_data, decrypt_vault_data
from backend.security import get_current_user_and_session, require_verified_user

router = APIRouter(prefix="/api/vault", tags=["vault"])

def format_entry_response(row: dict, user_id: str, reveal_password: bool = False) -> dict:
    enc_pw = row.get("encrypted_password", "")
    enc_note = row.get("encrypted_notes", "")
    
    ad = f"user:{user_id}"
    decrypted_note = decrypt_vault_data(enc_note, ad)
    
    if reveal_password:
        password_val = decrypt_vault_data(enc_pw, ad)
    else:
        password_val = "••••••••"

    return {
        "id": row["id"],
        "name": row["name"],
        "url": row["url"],
        "username": row["username"],
        "password": password_val,
        "is_revealed": reveal_password,
        "note": decrypted_note,
        "category_id": row["category_id"],
        "category_name": row.get("category_name") or "Uncategorized",
        "custom_order": row.get("custom_order", 0),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "password_updated_at": row["password_updated_at"]
    }

@router.get("")
async def list_entries(
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    sort_by: Optional[str] = None,
    user: dict = Depends(require_verified_user)
):
    user_id = user["user_id"]
    sort_mode = sort_by or user.get("sort_preference", "name_asc")

    order_clause = "LOWER(v.name) ASC"
    if sort_mode == "name_desc":
        order_clause = "LOWER(v.name) DESC"
    elif sort_mode == "recently_added_desc":
        order_clause = "v.created_at DESC"
    elif sort_mode == "recently_added_asc":
        order_clause = "v.created_at ASC"
    elif sort_mode == "recently_updated_desc":
        order_clause = "v.updated_at DESC"
    elif sort_mode == "category":
        order_clause = "COALESCE(c.name, 'zzz') ASC, LOWER(v.name) ASC"
    elif sort_mode == "custom":
        order_clause = "v.custom_order ASC, v.created_at DESC"

    with get_db() as conn:
        query = """
            SELECT v.*, c.name as category_name
            FROM vault_entries v
            LEFT JOIN categories c ON v.category_id = c.id
            WHERE v.user_id = ? AND v.deleted_at IS NULL
        """
        params = [user_id]

        if category_id:
            query += " AND v.category_id = ?"
            params.append(category_id)

        query += f" ORDER BY {order_clause}"
        rows = conn.execute(query, params).fetchall()

    results = []
    ad = f"user:{user_id}"
    search_term = search.strip().lower() if search else None

    for r in rows:
        d = dict(r)
        # Note decryption for search
        if search_term:
            decrypted_note = decrypt_vault_data(d.get("encrypted_notes", ""), ad).lower()
            name_val = d.get("name", "").lower()
            username_val = d.get("username", "").lower()
            url_val = d.get("url", "").lower()
            cat_val = (d.get("category_name") or "").lower()
            
            if not (search_term in name_val or search_term in username_val or
                    search_term in url_val or search_term in decrypted_note or
                    search_term in cat_val):
                continue

        results.append(format_entry_response(d, user_id, reveal_password=False))

    return {"entries": results, "total": len(results)}

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_entry(data: VaultEntryCreate, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    now_iso = datetime.now(timezone.utc).isoformat()
    entry_id = f"ent_{uuid.uuid4().hex[:16]}"
    ad = f"user:{user_id}"

    enc_pw = encrypt_vault_data(data.password, ad)
    enc_notes = encrypt_vault_data(data.note or "", ad)

    with get_db() as conn:
        # Validate category belongs to user or is system
        cat_id = data.category_id
        if cat_id:
            cat_row = conn.execute(
                "SELECT id FROM categories WHERE id = ? AND (user_id = ? OR is_system = 1)",
                (cat_id, user_id)
            ).fetchone()
            if not cat_row:
                cat_id = None  # fallback

        # Determine next custom order
        max_order = conn.execute(
            "SELECT COALESCE(MAX(custom_order), 0) FROM vault_entries WHERE user_id = ? AND deleted_at IS NULL",
            (user_id,)
        ).fetchone()[0]

        conn.execute("""
            INSERT INTO vault_entries (
                id, user_id, category_id, name, url, username,
                encrypted_password, encrypted_notes, custom_order,
                password_updated_at, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
        """, (
            entry_id, user_id, cat_id, data.name, data.url, data.username,
            enc_pw, enc_notes, max_order + 1, now_iso, now_iso, now_iso
        ))

        row = conn.execute("""
            SELECT v.*, c.name as category_name
            FROM vault_entries v
            LEFT JOIN categories c ON v.category_id = c.id
            WHERE v.id = ?
        """, (entry_id,)).fetchone()

    return format_entry_response(dict(row), user_id, reveal_password=False)

@router.get("/{entry_id}")
async def get_entry(entry_id: str, reveal: bool = False, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    with get_db() as conn:
        row = conn.execute("""
            SELECT v.*, c.name as category_name
            FROM vault_entries v
            LEFT JOIN categories c ON v.category_id = c.id
            WHERE v.id = ? AND v.user_id = ? AND v.deleted_at IS NULL
        """, (entry_id, user_id)).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Vault entry not found")

    return format_entry_response(dict(row), user_id, reveal_password=reveal)

@router.get("/{entry_id}/password")
async def get_entry_password(entry_id: str, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    with get_db() as conn:
        row = conn.execute("""
            SELECT encrypted_password
            FROM vault_entries
            WHERE id = ? AND user_id = ? AND deleted_at IS NULL
        """, (entry_id, user_id)).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Vault entry not found")

        ad = f"user:{user_id}"
        plain_pw = decrypt_vault_data(row["encrypted_password"], ad)

    return {"password": plain_pw}

@router.put("/{entry_id}")
async def update_entry(entry_id: str, data: VaultEntryUpdate, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    now_iso = datetime.now(timezone.utc).isoformat()
    ad = f"user:{user_id}"

    with get_db() as conn:
        row = conn.execute("""
            SELECT * FROM vault_entries WHERE id = ? AND user_id = ? AND deleted_at IS NULL
        """, (entry_id, user_id)).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Vault entry not found")

        updates = []
        params = []

        if data.name is not None:
            updates.append("name = ?")
            params.append(data.name.strip())

        if data.url is not None:
            u = data.url.strip()
            if u and not (u.startswith("http://") or u.startswith("https://")):
                u = "https://" + u
            updates.append("url = ?")
            params.append(u)

        if data.username is not None:
            updates.append("username = ?")
            params.append(data.username.strip())

        if data.password is not None:
            enc_pw = encrypt_vault_data(data.password, ad)
            updates.append("encrypted_password = ?")
            params.append(enc_pw)
            updates.append("password_updated_at = ?")
            params.append(now_iso)

        if data.note is not None:
            enc_notes = encrypt_vault_data(data.note, ad)
            updates.append("encrypted_notes = ?")
            params.append(enc_notes)

        if data.category_id is not None:
            cat_id = data.category_id
            if cat_id:
                cat_row = conn.execute(
                    "SELECT id FROM categories WHERE id = ? AND (user_id = ? OR is_system = 1)",
                    (cat_id, user_id)
                ).fetchone()
                if not cat_row:
                    cat_id = None
            updates.append("category_id = ?")
            params.append(cat_id)

        updates.append("updated_at = ?")
        params.append(now_iso)

        params.extend([entry_id, user_id])
        conn.execute(f"""
            UPDATE vault_entries
            SET {', '.join(updates)}
            WHERE id = ? AND user_id = ?
        """, params)

        updated_row = conn.execute("""
            SELECT v.*, c.name as category_name
            FROM vault_entries v
            LEFT JOIN categories c ON v.category_id = c.id
            WHERE v.id = ?
        """, (entry_id,)).fetchone()

    return format_entry_response(dict(updated_row), user_id, reveal_password=False)

@router.delete("/{entry_id}")
async def delete_entry_to_trash(entry_id: str, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        row = conn.execute("""
            SELECT id FROM vault_entries WHERE id = ? AND user_id = ? AND deleted_at IS NULL
        """, (entry_id, user_id)).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Vault entry not found")

        # Move to trash
        conn.execute("""
            UPDATE vault_entries
            SET deleted_at = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        """, (now_iso, now_iso, entry_id, user_id))

    return {"message": "Entry moved to Trash. It can be restored within 7 days."}

@router.post("/{entry_id}/duplicate")
async def duplicate_entry(entry_id: str, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    now_iso = datetime.now(timezone.utc).isoformat()
    new_entry_id = f"ent_{uuid.uuid4().hex[:16]}"

    with get_db() as conn:
        row = conn.execute("""
            SELECT * FROM vault_entries WHERE id = ? AND user_id = ? AND deleted_at IS NULL
        """, (entry_id, user_id)).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Vault entry not found")

        max_order = conn.execute(
            "SELECT COALESCE(MAX(custom_order), 0) FROM vault_entries WHERE user_id = ? AND deleted_at IS NULL",
            (user_id,)
        ).fetchone()[0]

        dup_name = f"Copy of {row['name']}"
        conn.execute("""
            INSERT INTO vault_entries (
                id, user_id, category_id, name, url, username,
                encrypted_password, encrypted_notes, custom_order,
                password_updated_at, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
        """, (
            new_entry_id, user_id, row["category_id"], dup_name, row["url"], row["username"],
            row["encrypted_password"], row["encrypted_notes"], max_order + 1,
            row["password_updated_at"], now_iso, now_iso
        ))

        new_row = conn.execute("""
            SELECT v.*, c.name as category_name
            FROM vault_entries v
            LEFT JOIN categories c ON v.category_id = c.id
            WHERE v.id = ?
        """, (new_entry_id,)).fetchone()

    return format_entry_response(dict(new_row), user_id, reveal_password=False)

@router.post("/{entry_id}/move-category")
async def move_entry_category(entry_id: str, data: VaultEntryMoveCategory, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        row = conn.execute("""
            SELECT id FROM vault_entries WHERE id = ? AND user_id = ? AND deleted_at IS NULL
        """, (entry_id, user_id)).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Vault entry not found")

        cat_id = data.category_id
        if cat_id:
            cat_row = conn.execute(
                "SELECT id FROM categories WHERE id = ? AND (user_id = ? OR is_system = 1)",
                (cat_id, user_id)
            ).fetchone()
            if not cat_row:
                raise HTTPException(status_code=400, detail="Invalid category")

        conn.execute("""
            UPDATE vault_entries
            SET category_id = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        """, (cat_id, now_iso, entry_id, user_id))

        updated_row = conn.execute("""
            SELECT v.*, c.name as category_name
            FROM vault_entries v
            LEFT JOIN categories c ON v.category_id = c.id
            WHERE v.id = ?
        """, (entry_id,)).fetchone()

    return format_entry_response(dict(updated_row), user_id, reveal_password=False)

@router.put("/order")
async def update_custom_order(data: VaultOrderUpdate, user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    with get_db() as conn:
        for idx, entry_id in enumerate(data.order):
            conn.execute("""
                UPDATE vault_entries
                SET custom_order = ?
                WHERE id = ? AND user_id = ?
            """, (idx, entry_id, user_id))

    return {"message": "Custom order updated successfully"}
