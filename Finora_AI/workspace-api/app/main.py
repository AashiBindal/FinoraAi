"""FastAPI application entry point.

Run locally:  uvicorn app.main:app --reload   (from the backend/ folder)
API docs:     http://localhost:8000/docs
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import SessionLocal, init_db
from app.core.errors import register_error_handlers
from app.seed import seed

settings = get_settings()
logging.basicConfig(level=logging.DEBUG if settings.debug else logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("agentforge")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    if settings.seed_sample_data:
        with SessionLocal() as db:
            if seed(db):
                logger.info("Database seeded with default workspace data")
    yield


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description="Backend for the AgentForge agentic AI hackathon workspace.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)
app.include_router(api_router)


@app.get("/", include_in_schema=False)
def root():
    return {"name": settings.app_name, "version": __version__, "docs": "/docs", "health": "/api/health"}
