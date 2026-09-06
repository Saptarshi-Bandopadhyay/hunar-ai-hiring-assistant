"""create initial hiring assistant tables

Revision ID: 0001_initial
Revises:
Create Date: 2026-09-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "calls",
        sa.Column("id", sa.String(length=100), nullable=False),
        sa.Column("request_id", sa.String(length=100), nullable=True),
        sa.Column("callee_name", sa.String(length=200), nullable=False),
        sa.Column("mobile_number", sa.String(length=40), nullable=False),
        sa.Column("agent_id", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("lifecycle_status", sa.String(length=50), nullable=True),
        sa.Column("timezone", sa.String(length=80), nullable=True),
        sa.Column("recording_url", sa.Text(), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("custom_data", sa.JSON(), nullable=True),
        sa.Column("raw_payload", sa.JSON(), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("duration_minutes", sa.Float(), nullable=True),
        sa.Column("user_speech_duration", sa.Float(), nullable=True),
        sa.Column("engagement_status", sa.String(length=40), nullable=True),
        sa.Column("answered_by", sa.String(length=40), nullable=True),
        sa.Column("call_ended_by", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_webhook_event", sa.String(length=80), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_calls_agent_id", "calls", ["agent_id"], unique=False)
    op.create_index("ix_calls_lifecycle_status", "calls", ["lifecycle_status"], unique=False)
    op.create_index("ix_calls_request_id", "calls", ["request_id"], unique=False)
    op.create_index("ix_calls_callee_name", "calls", ["callee_name"], unique=False)

    op.create_table(
        "webhook_events",
        sa.Column("event_key", sa.String(length=200), nullable=False),
        sa.Column("call_id", sa.String(length=100), nullable=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("event_key"),
    )
    op.create_index("ix_webhook_events_call_id", "webhook_events", ["call_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_webhook_events_call_id", table_name="webhook_events")
    op.drop_table("webhook_events")
    op.drop_index("ix_calls_callee_name", table_name="calls")
    op.drop_index("ix_calls_request_id", table_name="calls")
    op.drop_index("ix_calls_lifecycle_status", table_name="calls")
    op.drop_index("ix_calls_agent_id", table_name="calls")
    op.drop_table("calls")
