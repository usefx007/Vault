import csv
import io
import uuid
import re
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Response
from backend.database import get_db
from backend.crypto import encrypt_vault_data, decrypt_vault_data
from backend.security import require_verified_user

router = APIRouter(prefix="/api/csv", tags=["csv"])

EXPECTED_HEADER = ["name", "url", "username", "password", "note"]
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB

def sanitize_formula_injection(val: str) -> str:
    """Neutralize formula injection triggers (=, +, -, @, tab, cr)."""
    if not val:
        return val
    # If starting with risky spreadsheet formula prefixes, prefix with single quote
    if val[0] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + val
    return val

def parse_and_validate_csv_content(content_str: str, user_id: str):
    f = io.StringIO(content_str)
    try:
        reader = csv.reader(f)
        header = next(reader, None)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Malformed CSV syntax: Unable to parse file.")

    if not header:
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    # Clean header: strip whitespace and BOM
    clean_header = [h.strip().replace('\ufeff', '') for h in header]
    if clean_header != EXPECTED_HEADER:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid CSV header. Expected exactly: 'name,url,username,password,note'. Found: '{','.join(clean_header)}'"
        )

    # Fetch existing entries for duplicate detection
    with get_db() as conn:
        existing_rows = conn.execute("""
            SELECT name, username, url
            FROM vault_entries
            WHERE user_id = ? AND deleted_at IS NULL
        """, (user_id,)).fetchall()

    existing_set = {(r["name"].strip().lower(), r["username"].strip().lower()) for r in existing_rows}

    valid_rows = []
    invalid_rows = []
    seen_in_csv = set()
    row_num = 1  # 1 is header

    for row in reader:
        row_num += 1
        # Skip completely empty rows
        if not row or all(c.strip() == '' for c in row):
            continue

        if len(row) != 5:
            invalid_rows.append({
                "row_number": row_num,
                "error": f"Invalid column count. Expected 5, found {len(row)}."
            })
            continue

        name, url, username, password, note = [c.strip() for c in row]

        # Validation rules
        row_errors = []
        if not name:
            row_errors.append("Website Name is required.")
        if not username:
            row_errors.append("Username / Email is required.")
        if not password:
            row_errors.append("Password is required.")

        # Sanitize URL if provided
        if url and not (url.startswith("http://") or url.startswith("https://")):
            url = "https://" + url

        if row_errors:
            invalid_rows.append({
                "row_number": row_num,
                "name": name,
                "username": username,
                "error": "; ".join(row_errors)
            })
            continue

        # Prevent formula injection on imported fields
        safe_name = sanitize_formula_injection(name)
        safe_url = sanitize_formula_injection(url)
        safe_username = sanitize_formula_injection(username)
        safe_note = sanitize_formula_injection(note)

        # Check duplicates
        key = (safe_name.lower(), safe_username.lower())
        is_duplicate = (key in existing_set) or (key in seen_in_csv)
        seen_in_csv.add(key)

        valid_rows.append({
            "row_number": row_num,
            "name": safe_name,
            "url": safe_url,
            "username": safe_username,
            "password": password,
            "note": safe_note,
            "is_duplicate": is_duplicate
        })

    return valid_rows, invalid_rows

@router.post("/preview")
async def preview_csv_import(
    file: UploadFile = File(...),
    user: dict = Depends(require_verified_user)
):
    user_id = user["user_id"]

    # File extension check
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are accepted.")

    # Read content
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit (2MB).")

    # Decode UTF-8 (handling BOM)
    try:
        content_str = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            content_str = contents.decode("latin-1")
        except Exception:
            raise HTTPException(status_code=400, detail="Unable to decode CSV file. Must be UTF-8 encoded.")

    valid_rows, invalid_rows = parse_and_validate_csv_content(content_str, user_id)

    # Return preview without revealing raw passwords
    preview_entries = []
    duplicates_count = 0
    for r in valid_rows:
        if r["is_duplicate"]:
            duplicates_count += 1
        preview_entries.append({
            "row_number": r["row_number"],
            "name": r["name"],
            "url": r["url"],
            "username": r["username"],
            "has_note": bool(r["note"]),
            "is_duplicate": r["is_duplicate"]
        })

    return {
        "filename": file.filename,
        "total_rows": len(valid_rows) + len(invalid_rows),
        "valid_rows_count": len(valid_rows),
        "invalid_rows_count": len(invalid_rows),
        "duplicates_count": duplicates_count,
        "errors": invalid_rows,
        "preview_entries": preview_entries,
        # Raw validated items encoded in safe state for confirmation
        "raw_valid": valid_rows
    }

@router.post("/confirm")
async def confirm_csv_import(
    payload: dict,
    user: dict = Depends(require_verified_user)
):
    user_id = user["user_id"]
    entries = payload.get("entries", [])
    skip_duplicates = payload.get("skip_duplicates", False)

    if not entries:
        raise HTTPException(status_code=400, detail="No valid entries provided to import.")

    now_iso = datetime.now(timezone.utc).isoformat()
    ad = f"user:{user_id}"

    with get_db() as conn:
        # Get or assign default system category "General"
        gen_cat = conn.execute("SELECT id FROM categories WHERE is_system = 1 AND name = 'General'").fetchone()
        default_cat_id = gen_cat["id"] if gen_cat else None

        # Fetch existing max custom order
        max_order = conn.execute(
            "SELECT COALESCE(MAX(custom_order), 0) FROM vault_entries WHERE user_id = ? AND deleted_at IS NULL",
            (user_id,)
        ).fetchone()[0]

        imported_count = 0
        skipped_count = 0

        for item in entries:
            if skip_duplicates and item.get("is_duplicate"):
                skipped_count += 1
                continue

            entry_id = f"ent_{uuid.uuid4().hex[:16]}"
            max_order += 1
            enc_pw = encrypt_vault_data(item["password"], ad)
            enc_notes = encrypt_vault_data(item.get("note", ""), ad)

            conn.execute("""
                INSERT INTO vault_entries (
                    id, user_id, category_id, name, url, username,
                    encrypted_password, encrypted_notes, custom_order,
                    password_updated_at, created_at, updated_at, deleted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
            """, (
                entry_id, user_id, default_cat_id,
                item["name"], item["url"], item["username"],
                enc_pw, enc_notes, max_order,
                now_iso, now_iso, now_iso
            ))
            imported_count += 1

    return {
        "message": f"Successfully imported {imported_count} entries ({skipped_count} skipped).",
        "imported_count": imported_count,
        "skipped_count": skipped_count
    }

@router.get("/export")
async def export_vault_csv(user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    ad = f"user:{user_id}"

    with get_db() as conn:
        rows = conn.execute("""
            SELECT name, url, username, encrypted_password, encrypted_notes
            FROM vault_entries
            WHERE user_id = ? AND deleted_at IS NULL
            ORDER BY created_at ASC
        """, (user_id,)).fetchall()

    # Generate RFC 4180 CSV
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(EXPECTED_HEADER)

    for r in rows:
        plain_pw = decrypt_vault_data(r["encrypted_password"], ad)
        plain_note = decrypt_vault_data(r["encrypted_notes"], ad)
        writer.writerow([
            r["name"],
            r["url"],
            r["username"],
            plain_pw,
            plain_note
        ])

    csv_data = output.getvalue()
    # UTF-8 with BOM for universal Excel/spreadsheet & text compatibility
    response_bytes = csv_data.encode("utf-8-sig")

    headers = {
        "Content-Disposition": 'attachment; filename="vault_export.csv"',
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
        "Expires": "0"
    }

    return Response(content=response_bytes, media_type="text/csv", headers=headers)
