"""Client for the Kaizen Express API, acting as the signed-in user.

The AI service never reads the database. Everything it knows or changes goes through the same authenticated REST endpoints the web
app uses, with the user's own access token, so ownership checks, validation and idempotency stay in one place (Express).
"""
from typing import Any, Dict, Optional

import httpx

from ..config import settings


class ApiError(Exception):
    """A non-2xx answer from Express (or no answer at all: status 503, code UPSTREAM_UNAVAILABLE)."""

    def __init__(self, status: int, code: str, message: str):
        super().__init__(f"{status} {code}: {message}")
        self.status = status
        self.code = code
        self.message = message


class KaizenApi:
    def __init__(
        self,
        token: str,
        base_url: Optional[str] = None,
        internal_token: Optional[str] = None,
        timeout: Optional[float] = None,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ):
        self._token = token
        self.base_url = (base_url or settings.KAIZEN_API_URL).rstrip("/")
        self._internal_token = settings.KAIZEN_INTERNAL_TOKEN if internal_token is None else internal_token
        self._timeout = timeout or settings.KAIZEN_API_TIMEOUT_SECONDS
        self._transport = transport

    def _headers(self) -> Dict[str, str]:
        headers = {"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"}
        if self._internal_token:
            # Lets Express skip its per-IP limiter for this server-to-server hop (users stay limited per account).
            headers["X-Kaizen-Internal"] = self._internal_token
        return headers

    async def request(self, method: str, path: str, *, params: Optional[Dict[str, Any]] = None, json: Any = None) -> Any:
        """Return the `data` of a successful `{success, data}` envelope; raise ApiError otherwise."""
        try:
            async with httpx.AsyncClient(timeout=self._timeout, transport=self._transport) as client:
                res = await client.request(method, f"{self.base_url}{path}", params=params, json=json, headers=self._headers())
        except httpx.HTTPError as e:
            raise ApiError(503, "UPSTREAM_UNAVAILABLE", f"Could not reach the Kaizen API ({type(e).__name__})") from None

        try:
            body = res.json()
        except ValueError:
            body = None
        if res.status_code >= 400 or not isinstance(body, dict) or body.get("success") is False:
            err = (body or {}).get("error") if isinstance(body, dict) else None
            err = err if isinstance(err, dict) else {}
            raise ApiError(res.status_code, str(err.get("code") or "ERROR"), str(err.get("message") or f"HTTP {res.status_code}"))
        return body.get("data")

    async def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
        return await self.request("GET", path, params=params)

    async def post(self, path: str, json: Any = None) -> Any:
        return await self.request("POST", path, json=json)

    async def patch(self, path: str, json: Any = None) -> Any:
        return await self.request("PATCH", path, json=json)

    async def put(self, path: str, json: Any = None) -> Any:
        return await self.request("PUT", path, json=json)

    async def delete(self, path: str) -> Any:
        return await self.request("DELETE", path)
