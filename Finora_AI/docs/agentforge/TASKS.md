# Task Board

Short-term, session-level tasks. The roadmap tasks live in the app; this file tracks what the team (and AI assistants) should do next. Move items between sections as they progress.

## 🔥 Next up (before / at problem announcement)

- [ ] Run setup on a real machine: `pip install -r requirements-dev.txt`, `pytest`, `npm install`, `npm run build`
- [ ] Commit `frontend/package-lock.json` after the first `npm install`
- [ ] Create the GitHub repo and push (`git remote add origin <url>` → `git push -u origin main`)
- [ ] Replace sample team members on the Team page with real names and roles
- [ ] Get an AI API key; set `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY` in `.env`; test Agent Workspace
- [ ] Set the hackathon name and phase deadlines once the schedule is known

## 📣 When the problem statement is announced

Follow `docs/PROBLEM_STATEMENT_PLAYBOOK.md`. Summary:
- [ ] Fill Project Overview (problem, users, solution, features, impact, objectives)
- [ ] Paste the official statement into Docs → Problem Statement
- [ ] Decide stack changes; record them in PROJECT_CONTEXT.md §2
- [ ] Define domain tools + API clients; write the domain system prompt
- [ ] Add domain models/endpoints/pages

## 🔄 In progress

_(nothing)_

## ✅ Done

- [x] Repository scaffold, git, `.gitignore`, `.env.example`
- [x] FastAPI backend: health, project, phases, tasks, progress, team, docs, integrations, agent
- [x] Agent runtime, providers (OpenAI-compatible, Anthropic), tool registry, 5 built-in tools
- [x] React frontend: 9 pages, design system, API client
- [x] README, PROJECT_CONTEXT, CLAUDE, ROADMAP, TASKS, docs/
- [x] Backend tests (API + agent runtime)
