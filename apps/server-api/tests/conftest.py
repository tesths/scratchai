import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("SERVER_API_DB_PATH", str(tmp_path / "server-api.sqlite3"))
    from app.main import create_app

    return TestClient(create_app())
