import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime, timezone
import uuid

DB_DIR = os.environ.get("VAULT_SECRETS_DIR", "/home/spark/vault_data")
DB_PATH = os.environ.get("VAULT_DB_PATH", os.path.join(DB_DIR, "vault.db"))

def get_db_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn

@contextmanager
def get_db():
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT,
            auth_provider TEXT NOT NULL DEFAULT 'local',
            is_verified INTEGER NOT NULL DEFAULT 0,
            view_preference TEXT NOT NULL DEFAULT 'cards',
            sort_preference TEXT NOT NULL DEFAULT 'name_asc',
            language TEXT NOT NULL DEFAULT 'en',
            theme TEXT NOT NULL DEFAULT 'system',
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            device_type TEXT NOT NULL DEFAULT 'Desktop',
            browser TEXT NOT NULL DEFAULT 'Unknown',
            os TEXT NOT NULL DEFAULT 'Unknown',
            ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
            approx_location TEXT NOT NULL DEFAULT 'Local Network',
            created_at TIMESTAMP NOT NULL,
            last_active TIMESTAMP NOT NULL,
            revoked_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            is_system INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL,
            UNIQUE(user_id, name)
        );

        CREATE TABLE IF NOT EXISTS vault_entries (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            username TEXT NOT NULL,
            encrypted_password TEXT NOT NULL,
            encrypted_notes TEXT NOT NULL,
            custom_order INTEGER NOT NULL DEFAULT 0,
            password_updated_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            deleted_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS auth_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT UNIQUE NOT NULL,
            token_type TEXT NOT NULL,
            new_email TEXT,
            created_at TIMESTAMP NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used_at TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_vault_user_active ON vault_entries(user_id, deleted_at);
        CREATE INDEX IF NOT EXISTS idx_vault_user_category ON vault_entries(user_id, category_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, revoked_at);
        CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token, token_type);
        CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
        """)

        # Prepopulate system categories
        system_categories = ["Logins", "Finance", "Social", "Work", "Personal", "General"]
        now = datetime.now(timezone.utc).isoformat()
        for cat_name in system_categories:
            cur = conn.execute("SELECT id FROM categories WHERE user_id IS NULL AND name = ?", (cat_name,))
            if not cur.fetchone():
                conn.execute(
                    "INSERT INTO categories (id, user_id, name, is_system, created_at) VALUES (?, NULL, ?, 1, ?)",
                    (f"sys_{cat_name.lower()}", cat_name, now)
                )

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully!")
