"""API tests for the workspace endpoints."""


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["ai_provider_configured"] is False


def test_seeded_roadmap_has_nine_phases(client):
    phases = client.get("/api/phases").json()
    assert len(phases) == 9
    assert phases[0]["title"] == "Problem Identification"
    assert phases[-1]["title"] == "Final Demo and Presentation"


def test_project_update(client):
    r = client.patch("/api/project", json={"problem_statement": "Test problem"})
    assert r.status_code == 200
    assert r.json()["problem_statement"] == "Test problem"
    acts = client.get("/api/project/activities").json()
    assert any("problem statement" in a["message"] for a in acts)


def test_task_lifecycle_updates_progress_and_phase_status(client):
    phase = client.post("/api/phases", json={"title": "Temp phase"}).json()
    t1 = client.post("/api/tasks", json={"title": "A", "phase_id": phase["id"]}).json()
    t2 = client.post("/api/tasks", json={"title": "B", "phase_id": phase["id"]}).json()

    p = client.get(f"/api/phases/{phase['id']}").json()
    assert p["progress"] == 0 and p["status"] == "not_started"

    client.patch(f"/api/tasks/{t1['id']}", json={"status": "done"})
    p = client.get(f"/api/phases/{phase['id']}").json()
    assert p["progress"] == 50.0 and p["status"] == "in_progress"

    client.patch(f"/api/tasks/{t2['id']}", json={"status": "done"})
    p = client.get(f"/api/phases/{phase['id']}").json()
    assert p["progress"] == 100.0 and p["status"] == "completed"

    summary = client.get("/api/progress").json()
    assert summary["total_tasks"] == summary["completed_tasks"] + summary["active_tasks"] + summary["pending_tasks"]
    assert 0 <= summary["overall_progress"] <= 100

    assert client.delete(f"/api/phases/{phase['id']}").status_code == 204


def test_task_validation_and_404(client):
    assert client.post("/api/tasks", json={"title": ""}).status_code == 422
    r = client.patch("/api/tasks/999999", json={"status": "done"})
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"
    assert client.post("/api/tasks", json={"title": "x", "phase_id": 999999}).status_code == 404


def test_team_crud(client):
    m = client.post("/api/team", json={"name": "Ada", "role": "AI"}).json()
    assert m["is_sample"] is False
    assert client.patch(f"/api/team/{m['id']}", json={"role": "Lead"}).json()["role"] == "Lead"
    assert client.delete(f"/api/team/{m['id']}").status_code == 204


def test_docs_sections(client):
    sections = client.get("/api/docs").json()
    assert len(sections) == 10
    r = client.patch("/api/docs/research", json={"content": "notes"})
    assert r.json()["content"] == "notes"


def test_agent_reports_not_configured(client):
    cfg = client.get("/api/agent/config").json()
    assert cfg["configured"] is False
    assert "api_key" not in cfg
    run = client.post("/api/agent/run", json={"message": "hello"}).json()
    assert run["status"] == "not_configured"
    assert run["steps"][0]["type"] == "info"


def test_agent_tools_listed(client):
    names = {t["name"] for t in client.get("/api/agent/tools").json()}
    assert {"calculator", "get_current_time", "list_tasks", "create_task"} <= names
