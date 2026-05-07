from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

import httpx
from fastapi import HTTPException, status

from app.core.config import Settings
from app.core.db import Database
from app.schemas import AIPromptResponse
from app.services.progress import ensure_student_release_assignment, latest_progress


@dataclass(frozen=True, slots=True)
class PromptContext:
    student_id: int
    release_id: int
    current_target: str
    step_summary: str
    snapshot_json: dict


@dataclass(frozen=True, slots=True)
class PromptResult:
    prompt: str
    provider_name: str


class PromptProvider(Protocol):
    def generate(self, context: PromptContext) -> PromptResult:
        raise NotImplementedError


class FallbackPromptProvider:
    provider_name = "fallback"

    def generate(self, context: PromptContext) -> PromptResult:
        snapshot_keys = ", ".join(sorted(context.snapshot_json.keys())) or "没有快照字段"
        prompt = (
            f"先聚焦当前目标：{context.current_target}。"
            f"你已经做了：{context.step_summary}。"
            f"下一步先完成一个最小改动，然后立刻运行一次。"
            f"当前快照字段：{snapshot_keys}。"
        )
        return PromptResult(prompt=prompt, provider_name=self.provider_name)


class HttpPromptProvider:
    provider_name = "http"

    def __init__(self, base_url: str, api_key: str | None, model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model

    def generate(self, context: PromptContext) -> PromptResult:
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a Scratch teaching assistant. Keep the response short and concrete.",
                },
                {
                    "role": "user",
                    "content": self._build_user_message(context),
                },
            ],
        }
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        with httpx.Client(base_url=self.base_url, timeout=10.0) as client:
            response = client.post("/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError("invalid prompt provider response") from exc

        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("empty prompt provider response")
        return PromptResult(prompt=content.strip(), provider_name=self.provider_name)

    def _build_user_message(self, context: PromptContext) -> str:
        snapshot_text = json.dumps(context.snapshot_json, ensure_ascii=False)
        return (
            f"学生正在处理 Scratch 作品。\n"
            f"当前目标：{context.current_target}\n"
            f"已有进展：{context.step_summary}\n"
            f"快照：{snapshot_text}\n"
            f"请给出下一步提示。"
        )


class ResilientPromptProvider:
    provider_name = "fallback"

    def __init__(self, primary: PromptProvider, fallback: PromptProvider) -> None:
        self.primary = primary
        self.fallback = fallback

    def generate(self, context: PromptContext) -> PromptResult:
        try:
            return self.primary.generate(context)
        except Exception:
            return self.fallback.generate(context)


def create_prompt_provider(settings: Settings) -> PromptProvider:
    fallback = FallbackPromptProvider()
    if settings.ai_provider != "http" or not settings.ai_base_url:
        return fallback
    return ResilientPromptProvider(
        HttpPromptProvider(settings.ai_base_url, settings.ai_api_key, settings.ai_model),
        fallback,
    )


def generate_and_store_prompt(
    db: Database,
    provider: PromptProvider,
    student_id: int,
    release_id: int,
) -> AIPromptResponse:
    ensure_student_release_assignment(db, student_id, release_id)
    progress_row = latest_progress(db, student_id, release_id)
    if progress_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="progress not found")

    context = PromptContext(
        student_id=student_id,
        release_id=release_id,
        current_target=progress_row["current_target"],
        step_summary=progress_row["step_summary"],
        snapshot_json=json.loads(progress_row["snapshot_json"]),
    )
    result = provider.generate(context)
    created_at = datetime.now(timezone.utc).isoformat()
    prompt_id = db.execute(
        "INSERT INTO ai_prompts (student_id, release_id, current_target, step_summary, snapshot_json, prompt, provider_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            student_id,
            release_id,
            context.current_target,
            context.step_summary,
            json.dumps(context.snapshot_json, ensure_ascii=False),
            result.prompt,
            result.provider_name,
            created_at,
        ),
    )
    return AIPromptResponse(
        id=prompt_id,
        student_id=student_id,
        release_id=release_id,
        current_target=context.current_target,
        step_summary=context.step_summary,
        snapshot_json=context.snapshot_json,
        prompt=result.prompt,
        provider_name=result.provider_name,
        created_at=created_at,
    )


def latest_prompt(db: Database, student_id: int, release_id: int):
    return db.fetch_one(
        """
        SELECT id, student_id, release_id, current_target, step_summary, snapshot_json, prompt, provider_name, created_at
        FROM ai_prompts
        WHERE student_id = ? AND release_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        """,
        (student_id, release_id),
    )


def latest_prompt_any(db: Database, student_id: int):
    return db.fetch_one(
        """
        SELECT id, student_id, release_id, current_target, step_summary, snapshot_json, prompt, provider_name, created_at
        FROM ai_prompts
        WHERE student_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        """,
        (student_id,),
    )
