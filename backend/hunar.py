import httpx
from fastapi import HTTPException
from .config import settings


class HunarError(Exception):
    def __init__(self, status_code: int, message: str, details=None):
        self.status_code = status_code
        self.message = message
        self.details = details
        super().__init__(message)


async def request(method: str, path: str, **kwargs):
    if not settings.hunar_api_key:
        raise HunarError(503, "HUNAR_API_KEY is not configured on the server.")
    headers = kwargs.pop("headers", {})
    headers["X-API-Key"] = settings.hunar_api_key
    headers.setdefault("Content-Type", "application/json")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.request(
            method,
            f"{settings.hunar_base_url}{path}",
            headers=headers,
            **kwargs,
        )
    try:
        payload = response.json()
    except Exception:
        payload = {"message": response.text}
    if response.status_code >= 400:
        message = payload.get("message") if isinstance(payload, dict) else None
        raise HunarError(response.status_code, message or f"Hunar API returned HTTP {response.status_code}", payload.get(
            "details") if isinstance(payload, dict) else None)
    return payload


async def list_agents(page=1, page_size=100):
    return await request("GET", "/agents/", params={"page": page, "page_size": page_size})


async def create_agent(data):
    return await request("POST", "/agents/", json=data)


async def list_numbers(page=1, page_size=100):
    return await request("GET", "/numbers/", params={"page": page, "page_size": page_size})


async def create_call(data):
    print(data)
    return await request("POST", "/calls/", json=data)


async def get_call(call_id):
    return await request("GET", f"/calls/{call_id}/")


async def list_calls(page=1, page_size=100):
    return await request("GET", "/calls/", params={"page": page, "page_size": page_size})
