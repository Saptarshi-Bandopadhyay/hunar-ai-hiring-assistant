from datetime import datetime
from typing import Any
from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

JSONType = JSON().with_variant(JSONB, "postgresql")

class Call(Base):
    __tablename__ = "calls"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    request_id: Mapped[str | None] = mapped_column(String(100), index=True)
    callee_name: Mapped[str] = mapped_column(String(200), index=True)
    mobile_number: Mapped[str] = mapped_column(String(40))
    agent_id: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str | None] = mapped_column(String(50))
    lifecycle_status: Mapped[str | None] = mapped_column(String(50), index=True)
    timezone: Mapped[str | None] = mapped_column(String(80))
    recording_url: Mapped[str | None] = mapped_column(Text)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSONType)
    custom_data: Mapped[dict[str, Any] | None] = mapped_column(JSONType)
    raw_payload: Mapped[dict[str, Any] | None] = mapped_column(JSONType)
    duration_seconds: Mapped[float | None]
    duration_minutes: Mapped[float | None]
    user_speech_duration: Mapped[float | None]
    engagement_status: Mapped[str | None] = mapped_column(String(40))
    answered_by: Mapped[str | None] = mapped_column(String(40))
    call_ended_by: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_webhook_event: Mapped[str | None] = mapped_column(String(80))

class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    event_key: Mapped[str] = mapped_column(String(200), primary_key=True)
    call_id: Mapped[str | None] = mapped_column(String(100), index=True)
    event_type: Mapped[str] = mapped_column(String(80))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
