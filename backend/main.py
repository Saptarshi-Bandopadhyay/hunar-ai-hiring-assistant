from datetime import datetime
from uuid import uuid4
from urllib.parse import urljoin

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .hunar import HunarError, create_agent as hunar_create_agent, create_call as hunar_create_call, get_call as hunar_get_call, list_agents as hunar_list_agents, list_calls as hunar_list_calls, list_numbers as hunar_list_numbers
from .models import Call, WebhookEvent
from .schemas import AgentCreate, CallCreate
from .webhooks import parse_json, verify_hunar_signature

app = FastAPI(title="Hunar Hiring Assistant API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

def api_error(exc: HunarError):
    raise HTTPException(status_code=exc.status_code, detail={"message": exc.message, "details": exc.details})

def public_base_url(request: Request) -> str:
    if settings.app_base_url:
        return settings.app_base_url
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", request.url.netloc))
    return f"{proto}://{host}"

def to_datetime(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None

def upsert_call(db: Session, payload: dict, event_type: str | None = None):
    call_id = payload.get("call_id") or payload.get("id")
    if not call_id:
        return None

    call = db.get(Call, call_id)
    if not call:
        call = Call(
            id=call_id,
            callee_name=payload.get("callee_name") or payload.get("to_name") or "Unknown candidate",
            mobile_number=payload.get("mobile_number") or payload.get("to_number") or "",
            agent_id=payload.get("agent_id") or "",
        )
        db.add(call)

    call.request_id = payload.get("request_id", call.request_id)
    call.status = payload.get("status", call.status)
    call.lifecycle_status = payload.get("lifecycle_status", call.lifecycle_status)
    call.timezone = payload.get("timezone", call.timezone)
    call.recording_url = payload.get("recording_url", call.recording_url)
    call.result = payload.get("result", call.result)
    call.custom_data = payload.get("custom_data", call.custom_data)
    call.raw_payload = payload
    call.duration_seconds = payload.get("duration_seconds", call.duration_seconds)
    call.duration_minutes = payload.get("duration_minutes", call.duration_minutes)
    call.user_speech_duration = payload.get("user_speech_duration", call.user_speech_duration)
    call.engagement_status = payload.get("engagement_status", call.engagement_status)
    call.answered_by = payload.get("answered_by", call.answered_by)
    call.call_ended_by = payload.get("call_ended_by", call.call_ended_by)
    call.created_at = to_datetime(payload.get("created_at")) or call.created_at
    call.started_at = to_datetime(payload.get("started_at")) or call.started_at
    call.ended_at = to_datetime(payload.get("ended_at")) or call.ended_at
    call.last_webhook_event = event_type or call.last_webhook_event
    return call

@app.get("/api/health")
async def health():
    return {
        "ok": True,
        "hunar_configured": bool(settings.hunar_api_key),
        "database_configured": bool(settings.database_url),
    }

@app.get("/api/agents")
async def agents():
    try:
        return {"ok": True, **await hunar_list_agents()}
    except HunarError as exc:
        api_error(exc)

@app.post("/api/agents")
async def create_agent(body: AgentCreate):
    try:
        result = await hunar_create_agent(body.model_dump(exclude_none=True))
        return {"ok": True, "agent": result}
    except HunarError as exc:
        api_error(exc)

@app.get("/api/numbers")
async def numbers():
    try:
        return {"ok": True, **await hunar_list_numbers()}
    except HunarError as exc:
        api_error(exc)

@app.post("/api/calls")
async def create_call(body: CallCreate, request: Request, db: Session = Depends(get_db)):
    callback = urljoin(public_base_url(request) + "/", "api/webhooks/hunar")
    data = body.model_dump(exclude_none=True)
    data["request_id"] = f"screen-{uuid4().hex[:20]}"
    data["callback_config"] = {"call_summary_callback_url": callback}

    try:
        result = await hunar_create_call(data)
    except HunarError as exc:
        api_error(exc)

    call_id = result.get("id")
    if call_id:
        upsert_call(db, {
            **result,
            "id": call_id,
            "agent_id": body.agent_id,
            "callee_name": body.callee_name,
            "mobile_number": body.mobile_number,
            "custom_data": body.custom_data,
        })
        db.commit()

    return {"ok": True, "call": result}

@app.get("/api/calls")
async def calls(page: int = 1, page_size: int = 100, db: Session = Depends(get_db)):
    try:
        result = await hunar_list_calls(page=page, page_size=min(page_size, 200))
        for item in result.get("results", []):
            upsert_call(db, item)
        db.commit()
        return {"ok": True, **result}
    except HunarError:
        # The local DB is still useful if the provider is temporarily unavailable.
        rows = db.query(Call).order_by(desc(Call.updated_at)).limit(min(page_size, 200)).all()
        return {"ok": True, "count": len(rows), "next": None, "previous": None, "results": [serialize_call(x) for x in rows], "source": "local"}

@app.get("/api/calls/{call_id}")
async def call_detail(call_id: str, db: Session = Depends(get_db)):
    try:
        result = await hunar_get_call(call_id)
        upsert_call(db, result)
        db.commit()
        return {"ok": True, "call": result}
    except HunarError as exc:
        row = db.get(Call, call_id)
        if row:
            return {"ok": True, "call": serialize_call(row), "source": "local"}
        api_error(exc)

def serialize_call(row: Call):
    return {
        "id": row.id,
        "request_id": row.request_id,
        "callee_name": row.callee_name,
        "mobile_number": row.mobile_number,
        "agent_id": row.agent_id,
        "status": row.status,
        "lifecycle_status": row.lifecycle_status,
        "timezone": row.timezone,
        "recording_url": row.recording_url,
        "result": row.result,
        "custom_data": row.custom_data,
        "duration_seconds": row.duration_seconds,
        "duration_minutes": row.duration_minutes,
        "user_speech_duration": row.user_speech_duration,
        "engagement_status": row.engagement_status,
        "answered_by": row.answered_by,
        "call_ended_by": row.call_ended_by,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "started_at": row.started_at.isoformat() if row.started_at else None,
        "ended_at": row.ended_at.isoformat() if row.ended_at else None,
    }

@app.post("/api/webhooks/hunar")
async def hunar_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Hunar-Signature")
    timestamp = request.headers.get("X-Hunar-Timestamp")

    if not verify_hunar_signature(signature, timestamp, body, settings.hunar_webhook_keys):
        raise HTTPException(status_code=401, detail="Invalid Hunar webhook signature")

    try:
        payload = parse_json(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON")

    event_type = payload.get("event_type", "unknown")
    call_id = payload.get("call_id")
    event_key = f"{event_type}:{call_id}:{payload.get('ended_at') or payload.get('recording_url') or payload.get('status') or uuid4().hex}"

    if db.get(WebhookEvent, event_key):
        return {"ok": True, "duplicate": True}

    db.add(WebhookEvent(event_key=event_key, call_id=call_id, event_type=event_type))
    upsert_call(db, payload, event_type)
    db.commit()

    return {"ok": True, "event_type": event_type}
