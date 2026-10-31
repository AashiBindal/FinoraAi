"""Base client for external API integrations.

Every third-party API (weather, maps, payments, search, government data...)
gets a thin client class here. Tools then wrap clients so the agent can use
them. Keeping clients separate from tools means they're reusable from normal
API routes as well, and easy to mock in tests.

Example (once the problem statement is known):

    class WeatherClient(ExternalAPIClient):
        def __init__(self, api_key: str):
            super().__init__(base_url="https://api.example.com", api_key=api_key)

        async def forecast(self, city: str) -> dict:
            return await self.get("/forecast", params={"q": city})
"""

import asyncio
from typing import Any

import httpx


class IntegrationError(Exception):
    pass


class ExternalAPIClient:
    def __init__(
        self,
        base_url: str,
        api_key: str = "",
        timeout: float = 20.0,
        retries: int = 2,
        auth_header: str = "Authorization",
        auth_prefix: str = "Bearer ",
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.retries = retries
        self.headers: dict[str, str] = {}
        if api_key:
            self.headers[auth_header] = f"{auth_prefix}{api_key}"

    async def request(self, method: str, path: str, **kwargs: Any) -> Any:
        url = f"{self.base_url}/{path.lstrip('/')}"
        last_exc: Exception | None = None
        for attempt in range(self.retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                    resp = await client.request(method, url, **kwargs)
                if resp.status_code >= 500 and attempt < self.retries:
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                if resp.status_code >= 400:
                    raise IntegrationError(f"{method} {url} -> HTTP {resp.status_code}: {resp.text[:200]}")
                return resp.json() if resp.content else None
            except httpx.HTTPError as exc:
                last_exc = exc
                if attempt < self.retries:
                    await asyncio.sleep(0.5 * (attempt + 1))
        raise IntegrationError(f"{method} {url} failed: {last_exc}")

    async def get(self, path: str, **kwargs: Any) -> Any:
        return await self.request("GET", path, **kwargs)

    async def post(self, path: str, **kwargs: Any) -> Any:
        return await self.request("POST", path, **kwargs)
