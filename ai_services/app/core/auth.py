from typing import Optional

from fastapi import Depends, Header, HTTPException

from .kaizen_api import KaizenApi


def bearer_token(authorization: Optional[str] = Header(default=None)) -> str:
    """The caller's Kaizen access token. It is never validated here: Express validates it on every call we make with it."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return token


def get_api(token: str = Depends(bearer_token)) -> KaizenApi:
    """Overridden in tests with a client on a mock transport."""
    return KaizenApi(token)
