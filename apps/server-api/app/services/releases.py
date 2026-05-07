from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.db import Database
from app.schemas import ReleaseResponse, TeacherReleaseListItem


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_release(
    db: Database,
    teacher_id: int,
    title: str,
    sb3_url: str,
    goal: str,
    status_text: str,
    assigned_student_ids: list[int],
) -> ReleaseResponse:
    unique_student_ids = list(dict.fromkeys(assigned_student_ids))
    if unique_student_ids:
        placeholders = ",".join("?" for _ in unique_student_ids)
        rows = db.fetch_all(
            f"SELECT id FROM students WHERE teacher_id = ? AND id IN ({placeholders})",
            (teacher_id, *unique_student_ids),
        )
        found_ids = {row["id"] for row in rows}
        missing_ids = [student_id for student_id in unique_student_ids if student_id not in found_ids]
        if missing_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="assigned student not found")

    release_id = db.execute(
        "INSERT INTO releases (teacher_id, title, sb3_url, goal, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (teacher_id, title, sb3_url, goal, status_text, _now()),
    )

    for student_id in unique_student_ids:
        db.execute(
            "INSERT OR IGNORE INTO release_assignments (release_id, student_id) VALUES (?, ?)",
            (release_id, student_id),
        )

    return get_release(db, teacher_id, release_id)


def get_release(db: Database, teacher_id: int, release_id: int) -> ReleaseResponse:
    row = db.fetch_one(
        "SELECT id, teacher_id, title, sb3_url, goal, status FROM releases WHERE id = ? AND teacher_id = ?",
        (release_id, teacher_id),
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="release not found")

    assigned_student_ids = [
        assignment_row["student_id"]
        for assignment_row in db.fetch_all(
            "SELECT student_id FROM release_assignments WHERE release_id = ? ORDER BY student_id",
            (release_id,),
        )
    ]
    return ReleaseResponse(
        id=row["id"],
        teacher_id=row["teacher_id"],
        title=row["title"],
        sb3_url=row["sb3_url"],
        goal=row["goal"],
        status=row["status"],
        assigned_student_ids=assigned_student_ids,
    )


def list_teacher_releases(db: Database, teacher_id: int) -> list[TeacherReleaseListItem]:
    rows = db.fetch_all(
        """
        SELECT r.id, r.title, r.sb3_url, r.goal, r.status, r.created_at, COUNT(ra.student_id) AS student_count
        FROM releases r
        LEFT JOIN release_assignments ra ON ra.release_id = r.id
        WHERE r.teacher_id = ?
        GROUP BY r.id
        ORDER BY r.id DESC
        """,
        (teacher_id,),
    )

    return [
        TeacherReleaseListItem(
            id=str(row["id"]),
            title=row["title"],
            className=row["goal"],
            status=row["status"],
            studentCount=row["student_count"],
            updatedAt=row["created_at"],
        )
        for row in rows
    ]


def ensure_teacher_release(db: Database, teacher_id: int, release_id: int) -> None:
    row = db.fetch_one(
        "SELECT id FROM releases WHERE id = ? AND teacher_id = ?",
        (release_id, teacher_id),
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="release not found")


def release_dashboard_students(db: Database, teacher_id: int, release_id: int) -> list[dict[str, object]]:
    ensure_teacher_release(db, teacher_id, release_id)
    rows = db.fetch_all(
        """
        SELECT s.id, s.username, s.display_name
        FROM students s
        JOIN release_assignments ra ON ra.student_id = s.id
        WHERE ra.release_id = ? AND s.teacher_id = ?
        ORDER BY s.id
        """,
        (release_id, teacher_id),
    )
    return [dict(row) for row in rows]
