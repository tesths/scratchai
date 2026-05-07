from fastapi import APIRouter, Depends

from app.core.db import Database
from app.dependencies import get_db, require_teacher
from app.schemas import DashboardResponse, LiveDashboardResponse, ReleaseCreateRequest, ReleaseResponse, TeacherReleaseListItem
from app.services.dashboard import build_live_release_dashboard, build_release_dashboard
from app.services.releases import create_release, list_teacher_releases


router = APIRouter(tags=["releases"])


@router.post("/releases", response_model=ReleaseResponse, status_code=201)
def create_release_route(
    payload: ReleaseCreateRequest,
    principal=Depends(require_teacher),
    db: Database = Depends(get_db),
) -> ReleaseResponse:
    return create_release(
        db,
        principal.user_id,
        payload.title,
        payload.sb3_url,
        payload.goal,
        payload.status,
        payload.assigned_student_ids,
    )


@router.post("/api/releases", response_model=ReleaseResponse, status_code=201)
def create_release_api_route(
    payload: ReleaseCreateRequest,
    principal=Depends(require_teacher),
    db: Database = Depends(get_db),
) -> ReleaseResponse:
    return create_release(
        db,
        principal.user_id,
        payload.title,
        payload.sb3_url,
        payload.goal,
        payload.status,
        payload.assigned_student_ids,
    )


@router.get("/api/releases", response_model=list[TeacherReleaseListItem])
def release_list_api_route(
    principal=Depends(require_teacher),
    db: Database = Depends(get_db),
) -> list[TeacherReleaseListItem]:
    return list_teacher_releases(db, principal.user_id)


@router.get("/releases/{release_id}/dashboard", response_model=DashboardResponse)
def release_dashboard_route(
    release_id: int,
    principal=Depends(require_teacher),
    db: Database = Depends(get_db),
) -> DashboardResponse:
    return build_release_dashboard(db, principal.user_id, release_id)


@router.get("/api/dashboard/releases/{release_id}/live", response_model=LiveDashboardResponse)
def release_live_dashboard_api_route(
    release_id: int,
    principal=Depends(require_teacher),
    db: Database = Depends(get_db),
) -> LiveDashboardResponse:
    return build_live_release_dashboard(db, principal.user_id, release_id)
