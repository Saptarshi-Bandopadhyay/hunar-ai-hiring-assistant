from typing import Any
from pydantic import BaseModel, Field, field_validator

class AgentCreate(BaseModel):
    name: str = Field(min_length=3, max_length=64)
    language: str
    voice_persona: str
    persona_name: str | None = None
    agent_prompt: str = Field(min_length=1)
    objective: str = Field(min_length=1)
    introduction: str = Field(min_length=1)
    result_prompt: str = Field(min_length=1)
    result_schema: dict[str, Any]

class CallCreate(BaseModel):
    agent_id: str
    callee_name: str = Field(min_length=1, max_length=200)
    mobile_number: str = Field(min_length=7, max_length=40)
    custom_data: dict[str, Any] = {}
    from_phone_number: str | None = None
    timezone: str = "Asia/Kolkata"
    retry_config: dict[str, int] | None = None
    guardrails: dict[str, Any] | None = None

    @field_validator("mobile_number")
    @classmethod
    def validate_phone(cls, value: str):
        if not value.startswith("+") or not value[1:].isdigit():
            raise ValueError("Use E.164 format, e.g. +919876543210")
        return value
