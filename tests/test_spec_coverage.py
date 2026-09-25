import sys
import os
import io
import csv
from datetime import datetime, timezone, timedelta

for p in ['/mnt/agentdata/gcs/c_5f2e6f561fca1901/app', '/working_dir/c_5f2e6f561fca1901/app']:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

TEST_DATA_DIR = "/home/spark/vault_test_spec_data"
os.environ["VAULT_SECRETS_DIR"] = TEST_DATA_DIR
os.environ["VAULT_DB_PATH"] = os.path.join(TEST_DATA_DIR, "test_spec.db")

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

def create_user_and_session(email, name, password="Password123!@#", verified=True, provider="local"):
    reg = client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
    if verified and provider == "local":
        tok = reg.json().get("verification_token")
        client.post("/api/auth/verify-email", json={"token": tok})
    login_resp = client.post("/api/auth/login", json={"email": email, "password": password})
    sid = login_resp.json()["session_id"]
    return sid

# 1. Authorization: Category isolation & Trash isolation & Export isolation
def test_authorization_cross_user_isolation():
    u1_sid = create_user_and_session("u1@test.com", "User One")
    u2_sid = create_user_and_session("u2@test.com", "User Two")

    # U1 creates category
    cat_resp = client.post("/api/categories", headers={"Authorization": f"Bearer {u1_sid}"}, json={"name": "U1 Private Category"})
    assert cat_resp.status_code == 201
    cat_id = cat_resp.json()["id"]

    # U2 cannot modify U1 category
    resp = client.put(f"/api/categories/{cat_id}", headers={"Authorization": f"Bearer {u2_sid}"}, json={"name": "Hacked Cat"})
    assert resp.status_code in (403, 404)

    # U2 cannot delete U1 category
    resp = client.delete(f"/api/categories/{cat_id}", headers={"Authorization": f"Bearer {u2_sid}"})
    assert resp.status_code in (403, 404)

    # U1 creates entry and deletes to Trash
    ent_resp = client.post("/api/vault", headers={"Authorization": f"Bearer {u1_sid}"}, json={
        "name": "U1 Secret", "url": "https://secret.com", "username": "u1", "password": "PW1", "note": "secret"
    })
    ent_id = ent_resp.json()["id"]
    client.delete(f"/api/vault/{ent_id}", headers={"Authorization": f"Bearer {u1_sid}"})

    # U2 cannot see U1 trash entry
    u2_trash = client.get("/api/trash", headers={"Authorization": f"Bearer {u2_sid}"}).json()["trash"]
    assert ent_id not in [t["id"] for t in u2_trash]

    # U2 cannot restore U1 trash entry
    resp = client.post(f"/api/trash/{ent_id}/restore", headers={"Authorization": f"Bearer {u2_sid}"})
    assert resp.status_code == 404

    # U2 cannot permanently delete U1 trash entry
    resp = client.delete(f"/api/trash/{ent_id}", headers={"Authorization": f"Bearer {u2_sid}"})
    assert resp.status_code == 404

    # U2 cannot access U1 sessions
    u1_sessions = client.get("/api/sessions", headers={"Authorization": f"Bearer {u1_sid}"}).json()["sessions"]
    u1_sid_record = u1_sessions[0]["id"]
    resp = client.post(f"/api/sessions/{u1_sid_record}/revoke", headers={"Authorization": f"Bearer {u2_sid}"})
    assert resp.status_code == 404

    # U2 cannot export U1 vault (U2 export contains only U2 data)
    export_resp = client.get("/api/csv/export", headers={"Authorization": f"Bearer {u2_sid}"})
    assert "U1 Secret" not in export_resp.text

# 2. Vault: Search, Sorting, Move Category, Duplicate
def test_vault_features_and_operations():
    sid = create_user_and_session("vaultops@test.com", "Vault Ops")
    h = {"Authorization": f"Bearer {sid}"}

    # Create category Work
    cat_resp = client.post("/api/categories", headers=h, json={"name": "Client Projects"})
    work_id = cat_resp.json()["id"]

    # Create entries A, B, C
    e1 = client.post("/api/vault", headers=h, json={
        "name": "Alpha Portal", "url": "https://alpha.com", "username": "alice_alpha", "password": "Password1!", "note": "Note A", "category_id": work_id
    }).json()
    e2 = client.post("/api/vault", headers=h, json={
        "name": "Beta Cloud", "url": "https://beta.com", "username": "bob_beta", "password": "Password2!", "note": "Note B"
    }).json()

    # Search by Website Name
    res = client.get("/api/vault?search=Alpha", headers=h).json()
    assert res["total"] == 1
    assert res["entries"][0]["name"] == "Alpha Portal"

    # Search by Username
    res = client.get("/api/vault?search=bob_beta", headers=h).json()
    assert res["total"] == 1

    # Search by Note
    res = client.get("/api/vault?search=Note A", headers=h).json()
    assert res["total"] == 1

    # Sorting
    res_asc = client.get("/api/vault?sort_by=name_asc", headers=h).json()
    assert res_asc["entries"][0]["name"] == "Alpha Portal"

    res_desc = client.get("/api/vault?sort_by=name_desc", headers=h).json()
    assert res_desc["entries"][0]["name"] == "Beta Cloud"

    # Move Category
    client.post(f"/api/vault/{e2['id']}/move-category", headers=h, json={"category_id": work_id})
    updated_e2 = client.get(f"/api/vault/{e2['id']}", headers=h).json()
    assert updated_e2["category_id"] == work_id

    # Duplicate entry
    dup = client.post(f"/api/vault/{e1['id']}/duplicate", headers=h).json()
    assert dup["name"] == "Copy of Alpha Portal"
    assert dup["username"] == "alice_alpha"

# 3. CSV Comprehensive Validation and Formula Injection
def test_csv_validation_and_formula_injection():
    sid = create_user_and_session("csvtester@test.com", "CSV Tester")
    h = {"Authorization": f"Bearer {sid}"}

    # Missing header / bad header
    bad_header_csv = "site,link,login,pw,info\nSite,http://s.com,u,p,n"
    resp = client.post("/api/csv/preview", headers=h, files={"file": ("test.csv", io.BytesIO(bad_header_csv.encode()), "text/csv")})
    assert resp.status_code == 400
    assert "Invalid CSV header" in resp.json()["detail"]

    # Wrong column count
    wrong_cols_csv = "name,url,username,password,note\nsite,http://s.com,user,pass\n" # 4 columns
    resp = client.post("/api/csv/preview", headers=h, files={"file": ("test.csv", io.BytesIO(wrong_cols_csv.encode()), "text/csv")})
    assert resp.status_code == 200
    assert resp.json()["invalid_rows_count"] == 1
    assert "Invalid column count" in resp.json()["errors"][0]["error"]

    # Formula injection test: entry starting with = or + or -
    formula_csv = "name,url,username,password,note\n=CMD|' /C calc'!A0,http://test.com,@malicious,+DangerousPassword123!,-DangerousNote\n"
    resp = client.post("/api/csv/preview", headers=h, files={"file": ("test.csv", io.BytesIO(formula_csv.encode()), "text/csv")})
    assert resp.status_code == 200
    preview = resp.json()
    assert preview["valid_rows_count"] == 1
    entry = preview["raw_valid"][0]
    # Sanitized with prepended single quote so spreadsheet engines do not execute formula
    assert entry["name"].startswith("'=")
    assert entry["username"].startswith("'@")
    assert entry["note"].startswith("'-")

    # Confirm import
    c_resp = client.post("/api/csv/confirm", headers=h, json={"entries": preview["raw_valid"]})
    assert c_resp.status_code == 200
    assert c_resp.json()["imported_count"] == 1

# 4. Settings: Name change, Email change flow, Password change & Google restrictions
def test_settings_and_account_features():
    sid = create_user_and_session("settingsuser@test.com", "Original Name")
    h = {"Authorization": f"Bearer {sid}"}

    # Change Name
    resp = client.put("/api/settings/profile", headers=h, json={"name": "Updated Name"})
    assert resp.status_code == 200
    me = client.get("/api/auth/me", headers=h).json()
    assert me["name"] == "Updated Name"

    # Request Email Change
    req_em = client.post("/api/settings/request-email-change", headers=h, json={"new_email": "new_email@test.com"})
    assert req_em.status_code == 200
    token = req_em.json()["confirmation_token"]

    # Verify old email is still active
    me_before = client.get("/api/auth/me", headers=h).json()
    assert me_before["email"] == "settingsuser@test.com"

    # Confirm Email Change
    conf_resp = client.post("/api/settings/confirm-email-change", headers=h, json={"token": token})
    assert conf_resp.status_code == 200

    # Verify email updated
    me_after = client.get("/api/auth/me", headers=h).json()
    assert me_after["email"] == "new_email@test.com"

if __name__ == "__main__":
    setup_module()
    test_authorization_cross_user_isolation()
    print("✓ Authorization cross-user isolation passed")
    test_vault_features_and_operations()
    print("✓ Vault features & operations passed")
    test_csv_validation_and_formula_injection()
    print("✓ CSV validation & formula injection passed")
    test_settings_and_account_features()
    print("✓ Settings & Account features passed")
    print("ALL SPEC COVERAGE TESTS PASSED!")
