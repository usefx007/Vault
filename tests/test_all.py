import sys
import os
import io
import csv
from datetime import datetime, timezone, timedelta

# Ensure app path in sys.path
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

# Configure isolated test database
TEST_DATA_DIR = "/home/spark/vault_test_data"
os.environ["VAULT_SECRETS_DIR"] = TEST_DATA_DIR
os.environ["VAULT_DB_PATH"] = os.path.join(TEST_DATA_DIR, "test_vault.db")

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import init_db, get_db
from backend.routes.trash import purge_expired_trash

client = TestClient(app)

def setup_module():
    import shutil
    if os.path.exists(TEST_DATA_DIR):
        shutil.rmtree(TEST_DATA_DIR)
    os.makedirs(TEST_DATA_DIR, exist_ok=True)
    init_db()

def test_01_registration_and_verification():
    # 1. Register Alice
    resp = client.post("/api/auth/register", json={
        "name": "Alice Smith",
        "email": "alice@example.com",
        "password": "Password123!@#"
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "verification_token" in data
    token = data["verification_token"]

    # 2. Try login before verification -> must fail with 403
    resp = client.post("/api/auth/login", json={
        "email": "alice@example.com",
        "password": "Password123!@#"
    })
    assert resp.status_code == 403

    # 3. Verify email with token
    resp = client.post("/api/auth/verify-email", json={"token": token})
    assert resp.status_code == 200

    # 4. Login after verification -> must succeed
    resp = client.post("/api/auth/login", json={
        "email": "alice@example.com",
        "password": "Password123!@#"
    })
    assert resp.status_code == 200
    assert "session_id" in resp.json()

def test_02_google_login_restrictions():
    # Google login creates verified user immediately
    resp = client.post("/api/auth/google", json={
        "email": "googleuser@example.com",
        "name": "Google User"
    })
    assert resp.status_code == 200
    user = resp.json()["user"]
    assert user["auth_provider"] == "google"
    assert user["is_verified"] is True
    sid = resp.json()["session_id"]

    # Try change password on Google account -> must fail with 400
    resp = client.post(
        "/api/settings/change-password",
        headers={"Authorization": f"Bearer {sid}"},
        json={
            "current_password": "any",
            "new_password": "NewPassword123!",
            "confirm_new_password": "NewPassword123!"
        }
    )
    assert resp.status_code == 400
    assert "Google-only" in resp.json()["detail"]

def test_03_forgot_and_reset_password():
    # Forgot password for Alice
    resp = client.post("/api/auth/forgot-password", json={"email": "alice@example.com"})
    assert resp.status_code == 200
    token = resp.json().get("reset_token")
    assert token is not None

    # Reset password
    resp = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "NewSecretPassword123!"
    })
    assert resp.status_code == 200

    # Login with old password fails
    resp = client.post("/api/auth/login", json={
        "email": "alice@example.com",
        "password": "Password123!@#"
    })
    assert resp.status_code == 401

    # Login with new password succeeds
    resp = client.post("/api/auth/login", json={
        "email": "alice@example.com",
        "password": "NewSecretPassword123!"
    })
    assert resp.status_code == 200

def test_04_authorization_and_idor_protection():
    # Register Bob
    resp = client.post("/api/auth/register", json={
        "name": "Bob Jones",
        "email": "bob@example.com",
        "password": "BobPassword123!"
    })
    token = resp.json()["verification_token"]
    client.post("/api/auth/verify-email", json={"token": token})
    bob_login = client.post("/api/auth/login", json={"email": "bob@example.com", "password": "BobPassword123!"})
    bob_sid = bob_login.json()["session_id"]

    # Login Alice
    alice_login = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "NewSecretPassword123!"})
    alice_sid = alice_login.json()["session_id"]

    # Alice creates vault entry
    resp = client.post(
        "/api/vault",
        headers={"Authorization": f"Bearer {alice_sid}"},
        json={
            "name": "GitHub",
            "url": "https://github.com",
            "username": "alice_git",
            "password": "AliceSecretPassword123!",
            "note": "Alice private notes"
        }
    )
    assert resp.status_code == 201
    entry_id = resp.json()["id"]

    # Bob tries to access Alice's entry -> 404 (IDOR blocked)
    resp = client.get(f"/api/vault/{entry_id}", headers={"Authorization": f"Bearer {bob_sid}"})
    assert resp.status_code == 404

    # Bob tries to get password of Alice's entry -> 404
    resp = client.get(f"/api/vault/{entry_id}/password", headers={"Authorization": f"Bearer {bob_sid}"})
    assert resp.status_code == 404

    # Bob tries to update Alice's entry -> 404
    resp = client.put(f"/api/vault/{entry_id}", headers={"Authorization": f"Bearer {bob_sid}"}, json={"name": "Hacked"})
    assert resp.status_code == 404

    # Bob tries to delete Alice's entry -> 404
    resp = client.delete(f"/api/vault/{entry_id}", headers={"Authorization": f"Bearer {bob_sid}"})
    assert resp.status_code == 404

def test_05_vault_crud_trash_and_7day_purge():
    # Alice login
    alice_login = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "NewSecretPassword123!"})
    alice_sid = alice_login.json()["session_id"]
    headers = {"Authorization": f"Bearer {alice_sid}"}

    # Create entry
    resp = client.post("/api/vault", headers=headers, json={
        "name": "AWS Console",
        "url": "https://aws.amazon.com",
        "username": "alice_aws",
        "password": "AWSP@ssword999!",
        "note": "Production root account"
    })
    assert resp.status_code == 201
    entry_id = resp.json()["id"]

    # Delete to Trash
    resp = client.delete(f"/api/vault/{entry_id}", headers=headers)
    assert resp.status_code == 200

    # Ensure it no longer appears in active Vault
    resp = client.get("/api/vault", headers=headers)
    active_ids = [e["id"] for e in resp.json()["entries"]]
    assert entry_id not in active_ids

    # Ensure it appears in Trash
    resp = client.get("/api/trash", headers=headers)
    trash_ids = [t["id"] for t in resp.json()["trash"]]
    assert entry_id in trash_ids

    # Restore entry
    resp = client.post(f"/api/trash/{entry_id}/restore", headers=headers)
    assert resp.status_code == 200

    # Check it is back in active Vault
    resp = client.get("/api/vault", headers=headers)
    active_ids = [e["id"] for e in resp.json()["entries"]]
    assert entry_id in active_ids

    # Now test 7-day automatic server-side permanent deletion
    # Delete again to Trash
    client.delete(f"/api/vault/{entry_id}", headers=headers)

    # Manually backdate deleted_at to 8 days ago in DB
    eight_days_ago = (datetime.now(timezone.utc) - timedelta(days=8)).isoformat()
    with get_db() as conn:
        conn.execute("UPDATE vault_entries SET deleted_at = ? WHERE id = ?", (eight_days_ago, entry_id))

    # Another entry deleted 2 days ago
    two_days_ago = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    recent_entry_id = "recent_trash_1"
    with get_db() as conn:
        conn.execute("""
            INSERT INTO vault_entries (id, user_id, name, url, username, encrypted_password, encrypted_notes, created_at, updated_at, password_updated_at, deleted_at)
            VALUES (?, (SELECT id FROM users WHERE email='alice@example.com'), 'Recent', 'http://a.com', 'user', 'enc', 'enc', ?, ?, ?, ?)
        """, (recent_entry_id, two_days_ago, two_days_ago, two_days_ago, two_days_ago))

    # Trigger server-side purge
    purge_expired_trash()

    # Expired entry (8 days old) must be permanently purged
    with get_db() as conn:
        r_expired = conn.execute("SELECT id FROM vault_entries WHERE id = ?", (entry_id,)).fetchone()
        assert r_expired is None, "Expired trash entry was not permanently deleted!"

        # Recent entry (2 days old) must remain in Trash
        r_recent = conn.execute("SELECT id FROM vault_entries WHERE id = ?", (recent_entry_id,)).fetchone()
        assert r_recent is not None, "Recent trash entry was incorrectly deleted!"

def test_06_security_center_evaluation():
    alice_login = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "NewSecretPassword123!"})
    alice_sid = alice_login.json()["session_id"]
    headers = {"Authorization": f"Bearer {alice_sid}"}

    # 1. Add a weak password
    client.post("/api/vault", headers=headers, json={
        "name": "Weak Test",
        "url": "http://example.com",
        "username": "user1",
        "password": "123",  # Weak
        "note": ""
    })

    # 2. Add reused passwords
    client.post("/api/vault", headers=headers, json={
        "name": "Reused 1",
        "url": "http://site1.com",
        "username": "user_reused",
        "password": "MyCustomPassword99!",
        "note": ""
    })
    client.post("/api/vault", headers=headers, json={
        "name": "Reused 2",
        "url": "http://site2.com",
        "username": "user_reused",
        "password": "MyCustomPassword99!",
        "note": ""
    })

    # 3. Add compromised password
    client.post("/api/vault", headers=headers, json={
        "name": "Compromised Test",
        "url": "http://site3.com",
        "username": "user_pwned",
        "password": "password123",  # In known breach database
        "note": ""
    })

    # Run audit
    resp = client.get("/api/security/audit", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "Critical", f"Status should be Critical due to compromised password, got {data['status']}"
    assert data["issues"]["weak"]["count"] >= 1
    assert data["issues"]["reused"]["count"] >= 2
    assert data["issues"]["compromised"]["count"] >= 1

def test_07_csv_strict_format_and_round_trip():
    alice_login = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "NewSecretPassword123!"})
    alice_sid = alice_login.json()["session_id"]
    headers = {"Authorization": f"Bearer {alice_sid}"}

    # Prepare strictly formatted CSV with Unicode & Arabic text, commas, quotes, and newlines in notes
    csv_text = (
        'name,url,username,password,note\r\n'
        'Codeforces,https://codeforces.com,user@cf.com,cfPass#123,"Notes with, comma"\r\n'
        'موقع البنك الأهلي,https://nbe.com.eg,arabic_user,Pass!Bank1,"ملاحظات بالعربية\nسطر جديد"\r\n'
        'Service With Formula,https://safe.com,testuser,ValidPass!,"=SUM(1,2)"\r\n'
    )

    file_bytes = io.BytesIO(csv_text.encode('utf-8'))
    resp = client.post(
        "/api/csv/preview",
        headers=headers,
        files={"file": ("import.csv", file_bytes, "text/csv")}
    )
    assert resp.status_code == 200, resp.text
    preview = resp.json()
    assert preview["total_rows"] == 3
    assert preview["valid_rows_count"] == 3
    assert preview["invalid_rows_count"] == 0

    # Confirm import
    confirm_resp = client.post(
        "/api/csv/confirm",
        headers=headers,
        json={"entries": preview["raw_valid"]}
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["imported_count"] == 3

    # Export CSV
    export_resp = client.get("/api/csv/export", headers=headers)
    assert export_resp.status_code == 200
    exported_csv = export_resp.content.decode("utf-8-sig")

    # Verify exported header is exactly 5 columns: name,url,username,password,note
    reader = csv.reader(io.StringIO(exported_csv))
    header = next(reader)
    assert header == ["name", "url", "username", "password", "note"]

    # Verify round-trip: import the exported CSV back!
    export_bytes = io.BytesIO(export_resp.content)
    reimport_resp = client.post(
        "/api/csv/preview",
        headers=headers,
        files={"file": ("reimport.csv", export_bytes, "text/csv")}
    )
    assert reimport_resp.status_code == 200
    re_preview = reimport_resp.json()
    assert re_preview["valid_rows_count"] > 0
    assert re_preview["invalid_rows_count"] == 0

def test_08_password_generator():
    resp = client.get("/api/generator/generate?length=16&uppercase=true&lowercase=true&numbers=true&symbols=true&exclude_ambiguous=true")
    assert resp.status_code == 200
    pw = resp.json()["password"]
    assert len(pw) == 16
    # Verify bounds
    resp_min = client.get("/api/generator/generate?length=6")
    assert resp_min.status_code == 200
    assert len(resp_min.json()["password"]) == 6

    resp_max = client.get("/api/generator/generate?length=28")
    assert resp_max.status_code == 200
    assert len(resp_max.json()["password"]) == 28

def test_09_account_deletion_flow():
    # Register disposable user Dave
    resp = client.post("/api/auth/register", json={
        "name": "Dave",
        "email": "dave@example.com",
        "password": "DavePassword123!"
    })
    token = resp.json()["verification_token"]
    client.post("/api/auth/verify-email", json={"token": token})
    dave_login = client.post("/api/auth/login", json={"email": "dave@example.com", "password": "DavePassword123!"})
    dave_sid = dave_login.json()["session_id"]
    headers = {"Authorization": f"Bearer {dave_sid}"}

    # Dave creates an entry
    resp = client.post("/api/vault", headers=headers, json={
        "name": "Dave Site",
        "url": "http://dave.com",
        "username": "dave",
        "password": "DavePass123!@",
        "note": "To be deleted"
    })
    entry_id = resp.json()["id"]

    # Try delete without typing DELETE -> fails
    resp = client.post("/api/settings/delete-account", headers=headers, json={"confirmation": "wrong"})
    assert resp.status_code == 400

    # Type DELETE -> succeeds
    resp = client.post("/api/settings/delete-account", headers=headers, json={"confirmation": "DELETE"})
    assert resp.status_code == 200

    # Verify session revoked and user purged
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 401

    # Verify vault entry purged from DB
    with get_db() as conn:
        r = conn.execute("SELECT id FROM vault_entries WHERE id = ?", (entry_id,)).fetchone()
        assert r is None
        u = conn.execute("SELECT id FROM users WHERE email = 'dave@example.com'").fetchone()
        assert u is None

if __name__ == "__main__":
    setup_module()
    test_01_registration_and_verification()
    print("Test 1 passed: Registration & Verification")
    test_02_google_login_restrictions()
    print("Test 2 passed: Google Login Restrictions")
    test_03_forgot_and_reset_password()
    print("Test 3 passed: Forgot & Reset Password")
    test_04_authorization_and_idor_protection()
    print("Test 4 passed: Authorization & IDOR Protection")
    test_05_vault_crud_trash_and_7day_purge()
    print("Test 5 passed: Vault CRUD, Trash & 7-Day Purge")
    test_06_security_center_evaluation()
    print("Test 6 passed: Security Center Evaluation")
    test_07_csv_strict_format_and_round_trip()
    print("Test 7 passed: CSV Strict Format & Round-trip")
    test_08_password_generator()
    print("Test 8 passed: Password Generator")
    test_09_account_deletion_flow()
    print("Test 9 passed: Permanent Account Deletion")
    print("ALL TESTS PASSED SUCCESSFULLY!")
