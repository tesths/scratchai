from fastapi import APIRouter, Body, Depends, HTTPException, status

from app.core.db import Database
from app.dependencies import get_db, get_prompt_provider, require_student
from app.schemas import AIPromptCreateRequest, AIPromptResponse
from app.services.ai import PromptProvider, generate_and_store_prompt


router = APIRouter(tags=["ai"])


@router.post("/ai/prompts", response_model=AIPromptResponse, status_code=201)
def ai_prompt_route(
    payload: AIPromptCreateRequest,
    principal=Depends(require_student),
    db: Database = Depends(get_db),
    provider: PromptProvider = Depends(get_prompt_provider),
) -> AIPromptResponse:
    if principal.user_id != payload.student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="student can only request own prompt")

    return generate_and_store_prompt(db, provider, payload.student_id, payload.release_id)


@router.post("/api/student/releases/{release_id}/hints", response_model=AIPromptResponse, status_code=201)
def ai_prompt_api_route(
    release_id: int,
    _payload: dict | None = Body(default=None),
    principal=Depends(require_student),
    db: Database = Depends(get_db),
    provider: PromptProvider = Depends(get_prompt_provider),
) -> AIPromptResponse:
    return generate_and_store_prompt(db, provider, principal.user_id, release_id)
