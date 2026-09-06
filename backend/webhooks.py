import base64
import hashlib
import hmac
import json
import time
from collections.abc import Iterable

from .config import settings

def verify_hunar_signature(
    signature_header: str | None,
    timestamp_header: str | None,
    request_body: bytes,
    trusted_api_keys: Iterable[str],
) -> bool:
    if not signature_header or not timestamp_header:
        return False
    try:
        timestamp = timestamp_header.strip()
        sent_at = int(timestamp)
    except (ValueError, TypeError):
        return False

    if abs(int(time.time()) - sent_at) > settings.webhook_tolerance_seconds:
        return False

    message = f"{timestamp}.".encode("utf-8") + request_body
    signatures = [s.strip() for s in signature_header.split(",") if s.strip()]

    for api_key in trusted_api_keys:
        digest = hmac.new(api_key.encode("utf-8"), message, hashlib.sha256).digest()
        computed = base64.b64encode(digest).decode("ascii")
        for supplied in signatures:
            if hmac.compare_digest(supplied, computed):
                return True
    return False

def parse_json(body: bytes):
    return json.loads(body.decode("utf-8"))
