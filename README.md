# VaultSafe — Secure Password Manager Web App

A production-quality, secure, responsive Password Manager Web App strictly adhering to security-first architecture principles.

## 1. Product Features

- **Authentication**:
  - Email + Password registration with mandatory email verification token.
  - Secure login with Scrypt password hashing ($N=32768, r=8, p=1$).
  - Google OAuth / Sign in with Google (immediate verification, local password disabled).
  - Forgot Password & Reset Password with single-use, time-limited cryptographic tokens.
  - Rate limiting against brute-force and credential stuffing.
- **Vault Data Protection**:
  - Sensitive vault entries (passwords and notes) encrypted at rest using **AES-256-GCM**.
  - Server-side master key management; encryption keys never exposed to the frontend.
  - Exactly 6 user-facing fields: Website Name, Website URL, Username/Email, Password, Notes, Category.
  - Hidden passwords by default with intentional user reveal toggles.
- **Organization & Search**:
  - System categories (`Logins`, `Finance`, `Social`, `Work`, `Personal`, `General`) + user custom categories.
  - Safe category deletion that preserves associated entries as Uncategorized.
  - Global real-time search across all entry fields.
  - Dynamic List View and Cards View with user preference persistence.
  - Sorting: Name (A-Z / Z-A), Recently Added (desc/asc), Recently Updated, Category, and drag-and-drop Custom Order.
- **Trash & Automatic 7-Day Purge**:
  - Deleted entries are moved to Trash and remain recoverable for 7 days.
  - Server-side background worker permanently purges entries older than 7 days.
- **Security Center**:
  - Identifies weak passwords, reused passwords (without exposing plaintext credentials), and outdated passwords (≥ 90 days).
  - Checks compromised passwords against known data breaches using Have I Been Pwned's API via SHA-1 **k-anonymity**.
  - Strict 3-state evaluation: **Secure**, **Warning**, **Critical** (zero numerical score).
- **Standalone Password Generator**:
  - Generates single passwords using cryptographically secure random number generators (`secrets` / `crypto.getRandomValues`).
  - Configurable length (6 to 28 characters, default 8) with character set toggles and ambiguous character exclusion.
- **Strict CSV Import & Export**:
  - Strict 5-column format: `name,url,username,password,note`.
  - Import file validation, formula injection protection (`=`, `+`, `-`, `@`), and interactive preview with duplicate detection before committing.
  - RFC 4180-compliant export with UTF-8 BOM, supporting quotes, commas, newlines, Arabic text, and Unicode.
- **Account & Session Management**:
  - Update profile name, two-step email change flow with confirmation link.
  - Device/session tracking (device type, browser, OS, IP address, approximate location, last active).
  - Revoke individual session or log out all other devices.
  - Permanent immediate account deletion requiring typing `DELETE`.
- **UI & Accessibility**:
  - Bilingual support: English (LTR) and Arabic (RTL with mirrored layout and typography).
  - Custom design system using the specified palette: `#05070D` (main bg), `#080D18` (secondary bg), `#0D1524` (surface), `#142B4A` (primary navy), `#1D4E89` (accent navy), `#3B82C4` (highlight blue), `#F1F5F9` (text), `#8B9BB0` (secondary text), `#17243A` (borders).
  - Themes: Dark, Light, System Default.
  - Safe clipboard copy with automatic 30-second clear timer.

## 2. Running the Application

### Prerequisites
Python 3.10+ with `fastapi`, `uvicorn`, `cryptography`, `pydantic`.

### Start the Server
```bash
python3 run.py
```
Open your browser at `http://localhost:8000`.

## 3. Running Automated Tests

Run the full automated test suites verifying all security, authorization, and vault features:

```bash
python3 tests/test_all.py
python3 tests/test_spec_coverage.py
```
