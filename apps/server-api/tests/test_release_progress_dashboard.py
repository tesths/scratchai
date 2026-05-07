
def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_teacher_student_release_progress_ai_and_dashboard_flow(client):
    register_teacher = client.post(
        "/teachers/register",
        json={"username": "teacher2", "password": "secret123"},
    )
    teacher_token = register_teacher.json()["access_token"]
    teacher_headers = auth_headers(teacher_token)

    create_student = client.post(
        "/students",
        headers=teacher_headers,
        json={"username": "student1", "password": "student-pass", "display_name": "小明"},
    )
    assert create_student.status_code == 201
    student_id = create_student.json()["id"]

    student_login = client.post(
        "/students/login",
        json={"username": "student1", "password": "student-pass"},
    )
    assert student_login.status_code == 200
    student_token = student_login.json()["access_token"]
    student_headers = auth_headers(student_token)

    create_release = client.post(
        "/releases",
        headers=teacher_headers,
        json={
            "title": "Space Game",
            "sb3_url": "https://example.com/space.sb3",
            "goal": "Finish movement loop",
            "status": "published",
            "assigned_student_ids": [student_id],
        },
    )
    assert create_release.status_code == 201
    release = create_release.json()
    release_id = release["id"]
    assert release["assigned_student_ids"] == [student_id]

    progress = client.post(
        "/progress",
        headers=student_headers,
        json={
            "student_id": student_id,
            "release_id": release_id,
            "current_target": "让角色左右移动",
            "step_summary": "已经接上方向键事件",
            "snapshot_json": {"blocks": 3},
        },
    )
    assert progress.status_code == 201
    progress_data = progress.json()
    assert progress_data["student_id"] == student_id
    assert progress_data["release_id"] == release_id
    assert progress_data["current_target"] == "让角色左右移动"

    prompt = client.post(
        "/ai/prompts",
        headers=student_headers,
        json={"student_id": student_id, "release_id": release_id},
    )
    assert prompt.status_code == 201
    prompt_data = prompt.json()
    assert prompt_data["student_id"] == student_id
    assert prompt_data["release_id"] == release_id
    assert prompt_data["provider_name"] == "fallback"
    assert "让角色左右移动" in prompt_data["prompt"]

    dashboard = client.get(f"/releases/{release_id}/dashboard", headers=teacher_headers)
    assert dashboard.status_code == 200
    dashboard_data = dashboard.json()
    assigned_students = dashboard_data["release"]["assigned_students"]
    assert len(assigned_students) == 1
    student_entry = assigned_students[0]
    assert student_entry["id"] == student_id
    assert student_entry["recent_progress"]["current_target"] == "让角色左右移动"
    assert student_entry["recent_ai_prompt"]["prompt"]


def test_web_teacher_routes_expose_students_releases_and_live_dashboard(client):
    register_teacher = client.post(
        "/api/teacher/register",
        json={"username": "teacher-web-2", "password": "secret123"},
    )
    teacher_token = register_teacher.json()["token"]
    teacher_headers = auth_headers(teacher_token)

    create_student = client.post(
        "/api/students",
        headers=teacher_headers,
        json={"username": "student-web", "password": "student-pass", "display_name": "小红"},
    )
    assert create_student.status_code == 201
    student_id = create_student.json()["id"]

    student_login = client.post(
        "/api/student/login",
        json={"username": "student-web", "password": "student-pass"},
    )
    assert student_login.status_code == 200
    student_token = student_login.json()["access_token"]
    student_headers = auth_headers(student_token)

    create_release = client.post(
        "/api/releases",
        headers=teacher_headers,
        json={
            "title": "Space Game",
            "sb3_url": "https://example.com/space.sb3",
            "goal": "Finish movement loop",
            "status": "published",
            "assigned_student_ids": [student_id],
        },
    )
    assert create_release.status_code == 201
    release_id = create_release.json()["id"]

    progress = client.post(
        f"/api/student/releases/{release_id}/progress",
        headers=student_headers,
        json={
            "currentTarget": "让角色左右移动",
            "stepSummary": "已经接上方向键事件",
            "snapshot": {"blocks": 3, "progress": 72},
        },
    )
    assert progress.status_code == 201

    prompt = client.post(
        f"/api/student/releases/{release_id}/hints",
        headers=student_headers,
        json={},
    )
    assert prompt.status_code == 201
    assert prompt.json()["provider_name"] == "fallback"

    list_students = client.get("/api/students", headers=teacher_headers)
    assert list_students.status_code == 200
    students = list_students.json()
    assert len(students) == 1
    assert students[0]["name"] == "小红"
    assert students[0]["progress"] == 72
    assert students[0]["latestAiHint"]

    list_releases = client.get("/api/releases", headers=teacher_headers)
    assert list_releases.status_code == 200
    releases = list_releases.json()
    assert len(releases) == 1
    assert releases[0]["title"] == "Space Game"
    assert releases[0]["studentCount"] == 1

    dashboard = client.get(f"/api/dashboard/releases/{release_id}/live", headers=teacher_headers)
    assert dashboard.status_code == 200
    dashboard_data = dashboard.json()
    assert dashboard_data["releaseId"] == str(release_id)
    assert dashboard_data["releaseTitle"] == "Space Game"
    assert dashboard_data["students"][0]["name"] == "小红"
    assert dashboard_data["students"][0]["progress"] == 72
