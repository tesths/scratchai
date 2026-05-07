from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class Settings:
    database_path: Path
    ai_provider: str
    ai_base_url: str | None
    ai_api_key: str | None
    ai_model: str


def load_settings() -> Settings:
    database_path = Path(os.getenv("SERVER_API_DB_PATH", "server-api.sqlite3")).expanduser()
    ai_base_url = os.getenv("AI_BASE_URL")
    ai_api_key = os.getenv("AI_API_KEY")
    ai_model = os.getenv("AI_MODEL", "scratch-ai-coach")
    ai_provider = os.getenv("AI_PROVIDER", "fallback").strip().lower() or "fallback"

    if ai_base_url and ai_provider == "fallback":
        ai_provider = "http"

    return Settings(
        database_path=database_path,
        ai_provider=ai_provider,
        ai_base_url=ai_base_url,
        ai_api_key=ai_api_key,
        ai_model=ai_model,
    )
