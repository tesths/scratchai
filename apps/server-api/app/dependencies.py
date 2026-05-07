from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.db import Database
from app.schemas import Principal


bearer_scheme = HTTPBearer(auto_error=False)


def get_db(request: Request) -> Database:
    return request.app.state.db


def get_prompt_provider(request: Request):
    return request.app.state.prompt_provider


def get_current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Database = Depends(get_db),
) -> Principal:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")

    token_row = db.fetch_one(
        "SELECT role, user_id FROM auth_tokens WHERE token = ?",
        (credentials.credentials,),
    )
    if token_row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid bearer token")

    if token_row["role"] == "teacher":
        user_row = db.fetch_one("SELECT username FROM teachers WHERE id = ?", (token_row["user_id"],))
    else:
        user_row = db.fetch_one("SELECT username FROM students WHERE id = ?", (token_row["user_id"],))

    username = user_row["username"] if user_row is not None else ""
    return Principal(role=token_row["role"], user_id=token_row["user_id"], username=username)


def require_teacher(principal: Principal = Depends(get_current_principal)) -> Principal:
    if principal.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="teacher access required")
    return principal


def require_student(principal: Principal = Depends(get_current_principal)) -> Principal:
    if principal.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="student access required")
    return principal
