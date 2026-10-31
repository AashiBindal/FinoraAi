# Development Roadmap

The live, editable version of this roadmap is in the app (**Roadmap** page). This file is the plan of record; keep both roughly in sync. Progress in the app is calculated from tasks.

Legend: ✅ done · 🔄 in progress · ⬜ not started

| # | Phase | Status | Exit criteria |
|---|---|---|---|
| 1 | Problem Identification | ⬜ | Problem statement written in Project Overview; judging criteria noted |
| 2 | Research and Requirement Analysis | ⬜ | APIs/datasets chosen; requirements listed in Docs → Research |
| 3 | Solution Design | ⬜ | MVP scope + demo storyline agreed; agent tools defined |
| 4 | System Architecture | 🔄 | Stack changes (if any) decided and documented |
| 5 | AI Agent Development | 🔄 | Real model connected; domain prompt; multi-step flow works |
| 6 | Tool and API Integration | 🔄 | Domain tools registered and tested |
| 7 | Frontend and Backend Integration | 🔄 | Domain screens show real agent output |
| 8 | Testing and Optimization | ⬜ | Failure cases handled; latency/cost acceptable |
| 9 | Final Demo and Presentation | ⬜ | Script rehearsed, backup recording, slides, README final |

---

## Phase 1 — Problem Identification
Understand the announced problem statement, theme and judging criteria.
- ⬜ Read the official problem statement and rules
- ⬜ Identify the core real-world problem and who it affects
- ⬜ Write the problem statement in Project Overview

## Phase 2 — Research and Requirement Analysis
- ⬜ Research existing solutions and their gaps
- ⬜ List available APIs, datasets and tools
- ⬜ Define functional and non-functional requirements

## Phase 3 — Solution Design
- ⬜ Define MVP scope and demo storyline
- ⬜ Design the agent's decision flow and tools
- ⬜ Sketch key user flows / screens

## Phase 4 — System Architecture
- ✅ Set up repository and project structure
- ✅ Define modular layered architecture
- ⬜ Decide final stack changes for the problem (models, DB, APIs)

## Phase 5 — AI Agent Development
- ✅ Build provider-agnostic agent runtime skeleton
- ⬜ Connect a real LLM provider via `.env`
- ⬜ Write the domain-specific system prompt
- ⬜ Add multi-step planning for the problem's workflow

## Phase 6 — Tool and API Integration
- ✅ Create tool registry with built-in tools
- ⬜ Implement API clients for the problem's external services
- ⬜ Register domain tools and test them in isolation

## Phase 7 — Frontend and Backend Integration
- ✅ Wire frontend workspace to FastAPI backend
- ⬜ Build domain-specific screens for the solution
- ⬜ Show real agent steps and tool results in the UI

## Phase 8 — Testing and Optimization
- ⬜ Write tests for tools and agent flows
- ⬜ Test failure cases (API down, bad model output)
- ⬜ Optimise prompts, latency and token usage

## Phase 9 — Final Demo and Presentation
- ⬜ Prepare demo script and backup recording
- ⬜ Build presentation slides
- ⬜ Final README update and submission
