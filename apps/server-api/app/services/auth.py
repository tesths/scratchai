from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.db import Database
from app.core.security import hash_password, issue_token, verify_password
from app.schemas import AuthResponse, StudentResponse, TeacherStudentListItem
from app.services.ai import latest_prompt_any
from app.services.progress import latest_progress_any


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def register_teacher(db: Database, username: str, password: str) -> AuthResponse:
    if db.fetch_one("SELECT id FROM teachers WHERE username = ?", (username,)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="teacher username already exists")

    teacher_id = db.execute(
        "INSERT INTO teachers (username, password_hash, created_at) VALUES (?, ?, ?)",
        (username, hash_password(password), _now()),
    )
    token = issue_token()
    db.execute(
        "INSERT INTO auth_tokens (role, user_id, token, created_at) VALUES (?, ?, ?, ?)",
        ("teacher", teacher_id, token, _now()),
    )
    return AuthResponse(access_token=token, role="teacher", user_id=teacher_id, username=username)


def login_teacher(db: Database, username: str, password: str) -> AuthResponse:
    row = db.fetch_one(
        "SELECT id, username, password_hash FROM teachers WHERE username = ?",
        (username,),
    )
    if row is None or not verify_password(password, row["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid teacher credentials")

    token = issue_token()
    db.execute(
        "INSERT INTO auth_tokens (role, user_id, token, created_at) VALUES (?, ?, ?, ?)",
        ("teacher", row["id"], token, _now()),
    )
    return AuthResponse(access_token=token, role="teacher", user_id=row["id"], username=row["username"])


def create_student(db: Database, teacher_id: int, username: str, password: str, display_name: str) -> StudentResponse:
    if db.fetch_one("SELECT id FROM students WHERE username = ?", (username,)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="student username already exists")

    student_id = db.execute(
        "INSERT INTO students (teacher_id, username, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)",
        (teacher_id, username, hash_password(password), display_name, _now()),
    )
    return StudentResponse(id=student_id, teacher_id=teacher_id, username=username, display_name=display_name)


def login_student(db: Database, username: str, password: str) -> AuthResponse:
    row = db.fetch_one(
        "SELECT id, username, password_hash FROM students WHERE username = ?",
        (username,),
    )
    if row is None or not verify_password(password, row["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid student credentials")

    token = issue_token()
    db.execute(
        "INSERT INTO auth_tokens (role, user_id, token, created_at) VALUES (?, ?, ?, ?)",
        ("student", row["id"], token, _now()),
    )
    return AuthResponse(access_token=token, role="student", user_id=row["id"], username=row["username"])


def list_teacher_students(db: Database, teacher_id: int) -> list[TeacherStudentListItem]:
    rows = db.fetch_all(
        """
        SELECT id, username, display_name, created_at
        FROM students
        WHERE teacher_id = ?
        ORDER BY id
        """,
        (teacher_id,),
    )

    result: list[TeacherStudentListItem] = []
    for row in rows:
        latest_progress = latest_progress_any(db, row["id"])
        latest_prompt = latest_prompt_any(db, row["id"])
        progress_value = 0
        updated_at = row["created_at"]

        if latest_progress is not None:
            snapshot = _parse_snapshot(latest_progress["snapshot_json"])
            progress_value = _coerce_progress(snapshot.get("progress"))
            updated_at = latest_progress["updated_at"]

        latest_hint = ""
        if latest_prompt is not None:
            latest_hint = latest_prompt["prompt"]
            updated_at = latest_prompt["created_at"]

        result.append(
            TeacherStudentListItem(
                id=str(row["id"]),
                name=row["display_name"] or row["username"],
                className="未分组",
                progress=progress_value,
                latestAiHint=latest_hint,
                updatedAt=updated_at,
            )
        )

    return result


def _parse_snapshot(raw_snapshot: str) -> dict:
    import json

    try:
        parsed = json.loads(raw_snapshot)
    except Exception:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _coerce_progress(value: object) -> int:
    if isinstance(value, bool):
        return 0
    if isinstance(value, (int, float)):
        return max(0, min(100, int(value)))
    return 0
