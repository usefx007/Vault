from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any
from collections import defaultdict
from fastapi import APIRouter, Depends
from backend.database import get_db
from backend.crypto import decrypt_vault_data
from backend.security import require_verified_user
from backend.hibp import check_hibp_k_anonymity

router = APIRouter(prefix="/api/security", tags=["security_center"])

COMMON_WEAK_PATTERNS = {
    "password", "123456", "12345678", "qwerty", "admin", "welcome",
    "letmein", "monkey", "dragon", "111111", "secret", "pass123",
    "p@ssw0rd", "p@ssword", "password123", "password1"
}

def evaluate_is_weak(password: str) -> bool:
    if not password or len(password) < 10:
        return True
    lower = password.lower()
    for pattern in COMMON_WEAK_PATTERNS:
        if pattern in lower:
            return True
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_symbol = any(not c.isalnum() for c in password)
    variety_count = sum([has_upper, has_lower, has_digit, has_symbol])
    return variety_count < 3

@router.get("/audit")
async def perform_security_audit(user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    now = datetime.now(timezone.utc)
    ninety_days_ago = now - timedelta(days=90)
    ad = f"user:{user_id}"

    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, name, url, username, encrypted_password, password_updated_at
            FROM vault_entries
            WHERE user_id = ? AND deleted_at IS NULL
        """, (user_id,)).fetchall()

    weak_entries = []
    old_entries = []
    password_groups: Dict[str, List[dict]] = defaultdict(list)
    compromised_entries = []

    for r in rows:
        d = dict(r)
        plain_pw = decrypt_vault_data(d["encrypted_password"], ad)
        entry_meta = {
            "id": d["id"],
            "name": d["name"],
            "url": d["url"],
            "username": d["username"]
        }

        # 1. Weak password check
        if evaluate_is_weak(plain_pw):
            weak_entries.append(entry_meta)

        # 2. Old password check (>= 90 days)
        try:
            pw_updated = datetime.fromisoformat(d["password_updated_at"])
            if pw_updated.tzinfo is None:
                pw_updated = pw_updated.replace(tzinfo=timezone.utc)
            if pw_updated <= ninety_days_ago:
                days_old = (now - pw_updated).days
                old_entries.append({**entry_meta, "days_old": days_old})
        except Exception:
            pass

        # 3. Group for reused password check (do not expose password!)
        if plain_pw:
            password_groups[plain_pw].append(entry_meta)

        # 4. HIBP k-anonymity compromised password check
        is_compromised, breach_count = await check_hibp_k_anonymity(plain_pw)
        if is_compromised:
            compromised_entries.append({
                **entry_meta,
                "breach_count": breach_count
            })

    # Prepare reused list: only groups with > 1 entry
    reused_groups = []
    reused_count = 0
    group_idx = 1
    for pw, group in password_groups.items():
        if len(group) > 1:
            reused_groups.append({
                "group_id": f"group_{group_idx}",
                "count": len(group),
                "entries": group
            })
            reused_count += len(group)
            group_idx += 1

    total_issues = (
        len(weak_entries) +
        reused_count +
        len(old_entries) +
        len(compromised_entries)
    )

    # Determine status rule
    # Critical: at least 1 compromised
    # Warning: at least 1 weak or reused or old, and 0 compromised
    # Secure: 0 compromised, 0 weak, 0 reused, 0 old
    if len(compromised_entries) > 0:
        status_state = "Critical"
    elif len(weak_entries) > 0 or reused_count > 0 or len(old_entries) > 0:
        status_state = "Warning"
    else:
        status_state = "Secure"

    return {
        "status": status_state,
        "total_issues": total_issues,
        "total_entries": len(rows),
        "issues": {
            "compromised": {
                "count": len(compromised_entries),
                "entries": compromised_entries
            },
            "weak": {
                "count": len(weak_entries),
                "entries": weak_entries
            },
            "reused": {
                "count": reused_count,
                "groups_count": len(reused_groups),
                "groups": reused_groups
            },
            "old": {
                "count": len(old_entries),
                "entries": old_entries
            }
        }
    }

@router.get("/dashboard-summary")
async def get_dashboard_summary(user: dict = Depends(require_verified_user)):
    user_id = user["user_id"]
    with get_db() as conn:
        total_entries = conn.execute(
            "SELECT COUNT(*) FROM vault_entries WHERE user_id = ? AND deleted_at IS NULL",
            (user_id,)
        ).fetchone()[0]

        categories_count = conn.execute(
            "SELECT COUNT(*) FROM categories WHERE user_id IS NULL OR user_id = ?",
            (user_id,)
        ).fetchone()[0]

        trash_count = conn.execute(
            "SELECT COUNT(*) FROM vault_entries WHERE user_id = ? AND deleted_at IS NOT NULL",
            (user_id,)
        ).fetchone()[0]

    # Quick audit for summary
    audit_data = await perform_security_audit(user)

    return {
        "total_entries": total_entries,
        "categories_count": categories_count,
        "trash_count": trash_count,
        "security_status": audit_data["status"],
        "total_security_issues": audit_data["total_issues"],
        "issues_breakdown": {
            "compromised_count": audit_data["issues"]["compromised"]["count"],
            "weak_count": audit_data["issues"]["weak"]["count"],
            "reused_count": audit_data["issues"]["reused"]["count"],
            "old_count": audit_data["issues"]["old"]["count"]
        }
    }
