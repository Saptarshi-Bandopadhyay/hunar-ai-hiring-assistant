from dotenv import load_dotenv

load_dotenv()

import os
from functools import lru_cache

class Settings:
    def __init__(self):
        self.hunar_api_key = os.getenv("HUNAR_API_KEY", "").strip()
        self.hunar_base_url = os.getenv(
            "HUNAR_BASE_URL",
            "https://api.voice.hunar.ai/external/v1"
        ).rstrip("/")
        self.hunar_webhook_keys = [
            x.strip() for x in os.getenv("HUNAR_WEBHOOK_API_KEYS", self.hunar_api_key).split(",") if x.strip()
        ]
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./hunar_hiring.db")
        self.app_base_url = os.getenv("APP_BASE_URL", "").rstrip("/")
        self.webhook_tolerance_seconds = int(os.getenv("HUNAR_WEBHOOK_TOLERANCE_SECONDS", "300"))

@lru_cache
def get_settings():
    return Settings()

settings = get_settings()
