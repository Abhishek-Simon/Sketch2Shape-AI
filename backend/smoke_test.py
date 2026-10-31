import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import httpx
from app.main import app

async def main():
    print("Testing root endpoint...", flush=True)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/")
        print("Root response:", r.json(), flush=True)

        print("Testing health endpoint...", flush=True)
        r_health = await c.get("/api/health")
        print("Health response:", r_health.json(), flush=True)

if __name__ == "__main__":
    asyncio.run(main())

