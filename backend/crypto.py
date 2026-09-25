import os
import secrets
import hashlib
import hmac
import base64
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

SECRETS_DIR = os.environ.get("VAULT_SECRETS_DIR", "/home/spark/vault_data")
KEY_FILE = os.path.join(SECRETS_DIR, ".vault_master.key")

def get_or_create_master_key() -> bytes:
    env_key = os.environ.get("VAULT_MASTER_KEY")
    if env_key:
        try:
            key_bytes = base64.b64decode(env_key)
            if len(key_bytes) == 32:
                return key_bytes
        except Exception:
            pass
    if os.path.exists(KEY_FILE):
        try:
            with open(KEY_FILE, "rb") as f:
                key = f.read().strip()
                if len(key) == 32:
                    return key
        except Exception:
            pass
    # Generate new 256-bit key
    key = secrets.token_bytes(32)
    os.makedirs(SECRETS_DIR, exist_ok=True)
    with open(KEY_FILE, "wb") as f:
        f.write(key)
    try:
        os.chmod(KEY_FILE, 0o600)
    except Exception:
        pass
    return key

MASTER_KEY = get_or_create_master_key()

# Password Hashing using Scrypt (RFC 7914: N=32768, r=8, p=1)
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    key = hashlib.scrypt(
        password.encode('utf-8'),
        salt=salt,
        n=32768,
        r=8,
        p=1,
        maxmem=64 * 1024 * 1024
    )
    return f"scrypt$32768$8$1${base64.b64encode(salt).decode('ascii')}${base64.b64encode(key).decode('ascii')}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        parts = hashed.split('$')
        if len(parts) != 6 or parts[0] != 'scrypt':
            return False
        n = int(parts[1])
        r = int(parts[2])
        p = int(parts[3])
        salt = base64.b64decode(parts[4])
        expected_key = base64.b64decode(parts[5])
        computed_key = hashlib.scrypt(
            password.encode('utf-8'),
            salt=salt,
            n=n,
            r=r,
            p=p,
            maxmem=64 * 1024 * 1024
        )
        return hmac.compare_digest(computed_key, expected_key)
    except Exception:
        return False

# Authenticated Encryption with AES-256-GCM
def encrypt_vault_data(plaintext: str, associated_data: Optional[str] = None) -> str:
    if plaintext is None:
        return ""
    aesgcm = AESGCM(MASTER_KEY)
    nonce = secrets.token_bytes(12)  # 96-bit nonce for GCM
    ad_bytes = associated_data.encode('utf-8') if associated_data else None
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), ad_bytes)
    return f"v1:{base64.b64encode(nonce).decode('ascii')}:{base64.b64encode(ciphertext).decode('ascii')}"

def decrypt_vault_data(encrypted_str: str, associated_data: Optional[str] = None) -> str:
    if not encrypted_str:
        return ""
    try:
        parts = encrypted_str.split(':')
        if len(parts) != 3 or parts[0] != 'v1':
            return ""
        nonce = base64.b64decode(parts[1])
        ciphertext = base64.b64decode(parts[2])
        aesgcm = AESGCM(MASTER_KEY)
        ad_bytes = associated_data.encode('utf-8') if associated_data else None
        plaintext_bytes = aesgcm.decrypt(nonce, ciphertext, ad_bytes)
        return plaintext_bytes.decode('utf-8')
    except Exception:
        return ""

def generate_token(length: int = 32) -> str:
    return secrets.token_urlsafe(length)

def generate_session_id() -> str:
    return secrets.token_hex(32)
