import logging
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import init_db
from app.interview import ws as interview_ws
from app.routers import analytics as analytics_router
from app.routers import auth as auth_router
from app.routers import reports as reports_router
from app.routers import resumes as resumes_router
from app.routers import sessions as sessions_router
from app.routers import settings as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router.router)
    app.include_router(settings_router.router)
    app.include_router(resumes_router.router)
    app.include_router(sessions_router.router)
    app.include_router(reports_router.router)
    app.include_router(analytics_router.router)
    app.include_router(interview_ws.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "app": settings.app_name}

    return app


app = create_app()
