"""Mounts every route module under /api. Add new routers here."""

from fastapi import APIRouter

from app.api.routes import agent, docs, health, integrations, progress, project, roadmap, team

api_router = APIRouter(prefix="/api")
for module in (health, project, roadmap, progress, team, docs, integrations, agent):
    api_router.include_router(module.router)
