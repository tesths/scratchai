from fastapi import APIRouter, Depends, HTTPException, status

from app.core.db import Database
from app.dependencies import get_db, require_student
from app.schemas import ApiProgressCreateRequest, ProgressCreateRequest, ProgressResponse
from app.services.progress import record_progress


router = APIRouter(tags=["progress"])


@router.post("/progress", response_model=ProgressResponse, status_code=201)
def progress_route(
    payload: ProgressCreateRequest,
    principal=Depends(require_student),
    db: Database = Depends(get_db),
) -> ProgressResponse:
    if principal.user_id != payload.student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="student can only report own progress")

    return record_progress(
        db,
        payload.student_id,
        payload.release_id,
        payload.current_target,
        payload.step_summary,
        payload.snapshot_json,
    )


@router.post("/api/student/releases/{release_id}/progress", response_model=ProgressResponse, status_code=201)
def progress_api_route(
    release_id: int,
    payload: ApiProgressCreateRequest,
    principal=Depends(require_student),
    db: Database = Depends(get_db),
) -> ProgressResponse:
    return record_progress(
        db,
        principal.user_id,
        release_id,
        payload.current_target,
        payload.step_summary,
        payload.snapshot_json,
    )
