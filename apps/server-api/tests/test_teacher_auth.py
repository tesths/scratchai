def test_teacher_can_register_and_login(client):
    register = client.post(
        "/teachers/register",
        json={"username": "teacher1", "password": "secret123"},
    )

    assert register.status_code == 201
    register_data = register.json()
    assert register_data["role"] == "teacher"
    assert register_data["username"] == "teacher1"
    assert register_data["access_token"]

    login = client.post(
        "/teachers/login",
        json={"username": "teacher1", "password": "secret123"},
    )

    assert login.status_code == 200
    login_data = login.json()
    assert login_data["role"] == "teacher"
    assert login_data["access_token"]


def test_web_teacher_auth_routes_return_frontend_session_shape(client):
    register = client.post(
        "/api/teacher/register",
        json={"username": "teacher-web", "password": "secret123"},
    )

    assert register.status_code == 201
    register_data = register.json()
    assert register_data["token"]
    assert register_data["teacherName"] == "teacher-web"

    login = client.post(
        "/api/teacher/login",
        json={"username": "teacher-web", "password": "secret123"},
    )

    assert login.status_code == 200
    login_data = login.json()
    assert login_data["token"]
    assert login_data["teacherName"] == "teacher-web"
