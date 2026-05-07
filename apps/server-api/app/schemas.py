from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]


class TeacherRegisterRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    role: Literal["teacher", "student"]
    user_id: int
    username: str


class TeacherSessionResponse(BaseModel):
    token: str
    teacherName: str


class Principal(BaseModel):
    role: Literal["teacher", "student"]
    user_id: int
    username: str = ""


class StudentCreateRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    display_name: str = Field(default="")


class StudentResponse(BaseModel):
    id: int
    teacher_id: int
    username: str
    display_name: str


class TeacherStudentListItem(BaseModel):
    id: str
    name: str
    className: str
    progress: int
    latestAiHint: str
    updatedAt: str


class ReleaseCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    sb3_url: str = Field(min_length=1)
    goal: str = Field(min_length=1)
    status: str = Field(min_length=1)
    assigned_student_ids: list[int] = Field(default_factory=list)


class ReleaseResponse(BaseModel):
    id: int
    teacher_id: int
    title: str
    sb3_url: str
    goal: str
    status: str
    assigned_student_ids: list[int]


class TeacherReleaseListItem(BaseModel):
    id: str
    title: str
    className: str
    status: str
    studentCount: int
    updatedAt: str


class ProgressCreateRequest(BaseModel):
    student_id: int
    release_id: int
    current_target: str = Field(min_length=1)
    step_summary: str = Field(min_length=1)
    snapshot_json: dict[str, Any] = Field(default_factory=dict)


class ApiProgressCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    current_target: str = Field(min_length=1, alias="currentTarget")
    step_summary: str = Field(min_length=1, alias="stepSummary")
    snapshot_json: dict[str, Any] = Field(default_factory=dict, alias="snapshot")


class ProgressResponse(BaseModel):
    id: int
    student_id: int
    release_id: int
    current_target: str
    step_summary: str
    snapshot_json: dict[str, Any]
    updated_at: str


class AIPromptCreateRequest(BaseModel):
    student_id: int
    release_id: int


class AIPromptResponse(BaseModel):
    id: int
    student_id: int
    release_id: int
    current_target: str
    step_summary: str
    snapshot_json: dict[str, Any]
    prompt: str
    provider_name: str
    created_at: str


class DashboardProgress(BaseModel):
    id: int
    current_target: str
    step_summary: str
    snapshot_json: dict[str, Any]
    updated_at: str


class DashboardPrompt(BaseModel):
    id: int
    current_target: str
    step_summary: str
    snapshot_json: dict[str, Any]
    prompt: str
    provider_name: str
    created_at: str


class DashboardStudent(BaseModel):
    id: int
    username: str
    display_name: str
    recent_progress: DashboardProgress | None
    recent_ai_prompt: DashboardPrompt | None


class DashboardRelease(BaseModel):
    id: int
    title: str
    sb3_url: str
    goal: str
    status: str
    assigned_students: list[DashboardStudent]


class DashboardResponse(BaseModel):
    release: DashboardRelease


class LiveDashboardStudent(BaseModel):
    id: str
    name: str
    progress: int
    latestAiHint: str
    updatedAt: str


class LiveDashboardResponse(BaseModel):
    releaseId: str
    releaseTitle: str
    updatedAt: str
    students: list[LiveDashboardStudent]
