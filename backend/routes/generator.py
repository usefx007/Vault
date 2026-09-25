import secrets
import string
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/generator", tags=["generator"])

AMBIGUOUS_CHARS = set("{}[]()/\\'\"`~,;:.<>I1lO0|")

@router.get("/generate")
async def generate_password(
    length: int = Query(8, ge=6, le=28),
    uppercase: bool = Query(True),
    lowercase: bool = Query(True),
    numbers: bool = Query(True),
    symbols: bool = Query(True),
    exclude_ambiguous: bool = Query(True)
):
    char_pool = []
    guaranteed = []

    upper_set = [c for c in string.ascii_uppercase if not (exclude_ambiguous and c in AMBIGUOUS_CHARS)]
    lower_set = [c for c in string.ascii_lowercase if not (exclude_ambiguous and c in AMBIGUOUS_CHARS)]
    digit_set = [c for c in string.digits if not (exclude_ambiguous and c in AMBIGUOUS_CHARS)]
    symbol_set = [c for c in "!@#$%^&*-_+=?" if not (exclude_ambiguous and c in AMBIGUOUS_CHARS)]

    if uppercase and upper_set:
        char_pool.extend(upper_set)
        guaranteed.append(secrets.choice(upper_set))
    if lowercase and lower_set:
        char_pool.extend(lower_set)
        guaranteed.append(secrets.choice(lower_set))
    if numbers and digit_set:
        char_pool.extend(digit_set)
        guaranteed.append(secrets.choice(digit_set))
    if symbols and symbol_set:
        char_pool.extend(symbol_set)
        guaranteed.append(secrets.choice(symbol_set))

    if not char_pool:
        raise HTTPException(status_code=400, detail="At least one character type must be selected.")

    # Fill remaining characters
    remaining_length = length - len(guaranteed)
    password_chars = list(guaranteed)
    for _ in range(max(0, remaining_length)):
        password_chars.append(secrets.choice(char_pool))

    # Cryptographically secure shuffle
    # Fisher-Yates using secrets.randbelow
    for i in range(len(password_chars) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        password_chars[i], password_chars[j] = password_chars[j], password_chars[i]

    return {"password": "".join(password_chars[:length])}
