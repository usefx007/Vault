import sys
import os
import uvicorn

# Ensure proper package path
for p in ['/mnt/agentdata/gcs/c_5f2e6f561fca1901/app', '/working_dir/c_5f2e6f561fca1901/app']:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

from backend.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
