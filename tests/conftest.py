import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


TEST_DATABASE_PATH = Path(tempfile.gettempdir()) / "competencies-api-tests.sqlite3"

# Settings are instantiated while the application modules are imported, so the
# isolated test configuration must be present before importing main/app.core.
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{TEST_DATABASE_PATH.as_posix()}"
os.environ["JWT_SECRET_KEY"] = "tests-only-jwt-secret-that-is-longer-than-32-characters"
os.environ["INITIAL_ADMIN_EMAIL"] = "admin@example.com"
os.environ["INITIAL_ADMIN_PASSWORD"] = "admin-test-password"
os.environ["AWS_ACCESS_KEY_ID"] = "tests-only-access-key"
os.environ["AWS_SECRET_ACCESS_KEY"] = "tests-only-secret-key"
os.environ["S3_ENDPOINT_URL"] = "http://s3.invalid"
os.environ["S3_PUBLIC_ENDPOINT_URL"] = "http://s3.invalid"
os.environ["S3_BUCKET_NAME"] = "tests-only-bucket"

from app.core.database import engine  # noqa: E402
from app.models.base import Base  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture
def client():
    """Return an API client backed by a fresh database for every test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def admin_tokens(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "admin-test-password"},
    )
    assert response.status_code == 200, response.text
    return response.json()


def authorization(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}

