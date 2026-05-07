from fastapi import APIRouter, Depends

from app.core.db import Database
from app.dependencies import get_db, require_teacher
from app.schemas import (
    AuthResponse,
    LoginRequest,
    StudentCreateRequest,
    StudentResponse,
    TeacherRegisterRequest,
    TeacherSessionResponse,
    TeacherStudentListItem,
)
from app.services.auth import create_student, list_teacher_students, login_student, login_teacher, register_teacher


router = APIRouter(tags=["auth"])


@router.post("/teachers/register", response_model=AuthResponse, status_code=201)
def teacher_register(payload: TeacherRegisterRequest, db: Database = Depends(get_db)) -> AuthResponse:
    return register_teacher(db, payload.username, payload.password)


@router.post("/api/teacher/register", response_model=TeacherSessionResponse, status_code=201)
def teacher_register_api(payload: TeacherRegisterRequest, db: Database = Depends(get_db)) -> TeacherSessionResponse:
    auth = register_teacher(db, payload.username, payload.password)
    return TeacherSessionResponse(token=auth.access_token, teacherName=auth.username)


@router.post("/teachers/login", response_model=AuthResponse)
def teacher_login(payload: LoginRequest, db: Database = Depends(get_db)) -> AuthResponse:
    return login_teacher(db, payload.username, payload.password)


@router.post("/api/teacher/login", response_model=TeacherSessionResponse)
def teacher_login_api(payload: LoginRequest, db: Database = Depends(get_db)) -> TeacherSessionResponse:
    auth = login_teacher(db, payload.username, payload.password)
    return TeacherSessionResponse(token=auth.access_token, teacherName=auth.username)


@router.post("/students", response_model=StudentResponse, status_code=201)
def student_create(
    payload: StudentCreateRequest,
    principal=Depends(require_teacher),
    db: Database = Depends(get_db),
) -> StudentResponse:
    return create_student(db, principal.user_id, payload.username, payload.password, payload.display_name)


@router.post("/api/students", response_model=StudentResponse, status_code=201)
def student_create_api(
    payload: StudentCreateRequest,
    principal=Depends(require_teacher),
    db: Database = Depends(get_db),
) -> StudentResponse:
    return create_student(db, principal.user_id, payload.username, payload.password, payload.display_name)


@router.get("/api/students", response_model=list[TeacherStudentListItem])
def student_list_api(
    principal=Depends(require_teacher),
    db: Database = Depends(get_db),
) -> list[TeacherStudentListItem]:
    return list_teacher_students(db, principal.user_id)


@router.post("/students/login", response_model=AuthResponse)
def student_login(payload: LoginRequest, db: Database = Depends(get_db)) -> AuthResponse:
    return login_student(db, payload.username, payload.password)


@router.post("/api/student/login", response_model=AuthResponse)
def student_login_api(payload: LoginRequest, db: Database = Depends(get_db)) -> AuthResponse:
    return login_student(db, payload.username, payload.password)
