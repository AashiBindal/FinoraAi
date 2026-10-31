"""Test setup: isolated temporary SQLite DB and an AI provider forced to 'none'.

Environment variables are set BEFORE the app is imported so settings pick them up.
"""

import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="agentforge-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["AI_PROVIDER"] = "none"
os.environ["SEED_SAMPLE_DATA"] = "true"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:  # runs lifespan -> creates tables + seeds
        yield c
