from __future__ import annotations

from fastapi import FastAPI

from app.core.config import Settings, load_settings
from app.core.db import Database
from app.routes.ai import router as ai_router
from app.routes.auth import router as auth_router
from app.routes.health import router as health_router
from app.routes.progress import router as progress_router
from app.routes.releases import router as releases_router
from app.services.ai import create_prompt_provider


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or load_settings()
    db = Database(resolved_settings.database_path)
    db.init_schema()

    app = FastAPI(title="Scratch AI Server API")
    app.state.settings = resolved_settings
    app.state.db = db
    app.state.prompt_provider = create_prompt_provider(resolved_settings)

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(releases_router)
    app.include_router(progress_router)
    app.include_router(ai_router)
    return app


app = create_app()


def main() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()
