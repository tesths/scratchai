from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.db import Database
from app.schemas import ProgressResponse


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def record_progress(
    db: Database,
    student_id: int,
    release_id: int,
    current_target: str,
    step_summary: str,
    snapshot_json: dict,
) -> ProgressResponse:
    ensure_student_release_assignment(db, student_id, release_id)
    payload = json.dumps(snapshot_json, ensure_ascii=False)
    progress_id = db.execute(
        "INSERT INTO progress_updates (student_id, release_id, current_target, step_summary, snapshot_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (student_id, release_id, current_target, step_summary, payload, _now()),
    )
    row = db.fetch_one(
        "SELECT id, student_id, release_id, current_target, step_summary, snapshot_json, updated_at FROM progress_updates WHERE id = ?",
        (progress_id,),
    )
    return _progress_row_to_response(row)


def latest_progress(db: Database, student_id: int, release_id: int):
    return db.fetch_one(
        """
        SELECT id, student_id, release_id, current_target, step_summary, snapshot_json, updated_at
        FROM progress_updates
        WHERE student_id = ? AND release_id = ?
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
        """,
        (student_id, release_id),
    )


def latest_progress_any(db: Database, student_id: int):
    return db.fetch_one(
        """
        SELECT id, student_id, release_id, current_target, step_summary, snapshot_json, updated_at
        FROM progress_updates
        WHERE student_id = ?
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
        """,
        (student_id,),
    )


def ensure_student_release_assignment(db: Database, student_id: int, release_id: int) -> None:
    row = db.fetch_one(
        """
        SELECT 1
        FROM release_assignments ra
        JOIN releases r ON r.id = ra.release_id
        WHERE ra.student_id = ? AND ra.release_id = ?
        LIMIT 1
        """,
        (student_id, release_id),
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="student release assignment not found")


def _progress_row_to_response(row) -> ProgressResponse:
    return ProgressResponse(
        id=row["id"],
        student_id=row["student_id"],
        release_id=row["release_id"],
        current_target=row["current_target"],
        step_summary=row["step_summary"],
        snapshot_json=json.loads(row["snapshot_json"]),
        updated_at=row["updated_at"],
    )
