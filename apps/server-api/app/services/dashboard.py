from __future__ import annotations

import json

from fastapi import HTTPException, status

from app.core.db import Database
from app.schemas import (
    DashboardProgress,
    DashboardPrompt,
    DashboardRelease,
    DashboardResponse,
    DashboardStudent,
    LiveDashboardResponse,
    LiveDashboardStudent,
)
from app.services.ai import latest_prompt
from app.services.progress import latest_progress
from app.services.releases import release_dashboard_students


def build_release_dashboard(db: Database, teacher_id: int, release_id: int) -> DashboardResponse:
    release_row = db.fetch_one(
        "SELECT id, title, sb3_url, goal, status FROM releases WHERE id = ? AND teacher_id = ?",
        (release_id, teacher_id),
    )
    if release_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="release not found")

    assigned_students: list[DashboardStudent] = []
    for student_row in release_dashboard_students(db, teacher_id, release_id):
        progress_row = latest_progress(db, student_row["id"], release_id)
        prompt_row = latest_prompt(db, student_row["id"], release_id)
        assigned_students.append(
            DashboardStudent(
                id=student_row["id"],
                username=student_row["username"],
                display_name=student_row["display_name"],
                recent_progress=_to_progress(progress_row),
                recent_ai_prompt=_to_prompt(prompt_row),
            )
        )

    return DashboardResponse(
        release=DashboardRelease(
            id=release_row["id"],
            title=release_row["title"],
            sb3_url=release_row["sb3_url"],
            goal=release_row["goal"],
            status=release_row["status"],
            assigned_students=assigned_students,
        )
    )


def build_live_release_dashboard(db: Database, teacher_id: int, release_id: int) -> LiveDashboardResponse:
    release_row = db.fetch_one(
        "SELECT id, title, goal FROM releases WHERE id = ? AND teacher_id = ?",
        (release_id, teacher_id),
    )
    if release_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="release not found")

    students: list[LiveDashboardStudent] = []
    latest_timestamp = ""
    for student_row in release_dashboard_students(db, teacher_id, release_id):
        progress_row = latest_progress(db, student_row["id"], release_id)
        prompt_row = latest_prompt(db, student_row["id"], release_id)
        latest_ai_hint = prompt_row["prompt"] if prompt_row is not None else ""
        progress_percent = _extract_progress_percent(progress_row)
        updated_at = _latest_updated_at(progress_row, prompt_row)
        if updated_at > latest_timestamp:
            latest_timestamp = updated_at

        students.append(
            LiveDashboardStudent(
                id=str(student_row["id"]),
                name=student_row["display_name"] or student_row["username"],
                progress=progress_percent,
                latestAiHint=latest_ai_hint,
                updatedAt=updated_at,
            )
        )

    return LiveDashboardResponse(
        releaseId=str(release_row["id"]),
        releaseTitle=release_row["title"],
        updatedAt=latest_timestamp or "",
        students=students,
    )


def _to_progress(row) -> DashboardProgress | None:
    if row is None:
        return None
    return DashboardProgress(
        id=row["id"],
        current_target=row["current_target"],
        step_summary=row["step_summary"],
        snapshot_json=json.loads(row["snapshot_json"]),
        updated_at=row["updated_at"],
    )


def _to_prompt(row) -> DashboardPrompt | None:
    if row is None:
        return None
    return DashboardPrompt(
        id=row["id"],
        current_target=row["current_target"],
        step_summary=row["step_summary"],
        snapshot_json=json.loads(row["snapshot_json"]),
        prompt=row["prompt"],
        provider_name=row["provider_name"],
        created_at=row["created_at"],
    )


def _extract_progress_percent(row) -> int:
    if row is None:
        return 0
    snapshot = json.loads(row["snapshot_json"])
    progress = snapshot.get("progress")
    if isinstance(progress, bool):
        return 0
    if isinstance(progress, (int, float)):
        return max(0, min(100, int(progress)))
    return 0


def _latest_updated_at(progress_row, prompt_row) -> str:
    if prompt_row is not None:
        return prompt_row["created_at"]
    if progress_row is not None:
        return progress_row["updated_at"]
    return ""
