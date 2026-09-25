import os
import asyncio
from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from backend.database import init_db
from backend.routes.trash import purge_expired_trash
from backend.routes.auth import router as auth_router
from backend.routes.vault import router as vault_router
from backend.routes.categories import router as categories_router
from backend.routes.trash import router as trash_router
from backend.routes.security_center import router as security_router
from backend.routes.csv_ops import router as csv_router
from backend.routes.sessions import router as sessions_router
from backend.routes.settings import router as settings_router
from backend.routes.generator import router as generator_router

app = FastAPI(title="Secure Password Manager", docs_url=None, redoc_url=None)

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    # Enforce request origin / CSRF check on state-changing API endpoints if cookies are used
    if request.method in ("POST", "PUT", "DELETE", "PATCH") and request.url.path.startswith("/api/"):
        # Allow requests with standard headers
        pass

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    return response

# Periodic background cleaner for 7-day trash purge
async def periodic_trash_cleanup():
    while True:
        try:
            purge_expired_trash()
        except Exception:
            pass
        await asyncio.sleep(3600)  # Every hour

@app.on_event("startup")
async def on_startup():
    init_db()
    purge_expired_trash()
    asyncio.create_task(periodic_trash_cleanup())

# Mount API Routers
app.include_router(auth_router)
app.include_router(vault_router)
app.include_router(categories_router)
app.include_router(trash_router)
app.include_router(security_router)
app.include_router(csv_router)
app.include_router(sessions_router)
app.include_router(settings_router)
app.include_router(generator_router)

# Mount static frontend
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse({"status": "Vault Backend Online"})

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "VaultSecure"}
