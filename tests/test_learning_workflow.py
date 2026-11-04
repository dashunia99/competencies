import pytest

from app.core.database import SessionLocal
from app.models.base import Stack
from tests.conftest import authorization


EXPERT = {
    "fio": "Эксперт Тестов",
    "email": "expert@example.com",
    "password": "expert-test-password",
    "role_name": "Эксперт",
}
EMPLOYEE = {
    "fio": "Сотрудник Тестов",
    "email": "employee@example.com",
    "password": "employee-test-password",
    "role_name": "Сотрудник",
}


def login(client, email: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
def workflow(client, admin_tokens):
    admin_headers = authorization(admin_tokens["access_token"])

    expert_response = client.post("/api/v1/users/", json=EXPERT, headers=admin_headers)
    employee_response = client.post("/api/v1/users/", json=EMPLOYEE, headers=admin_headers)
    assert expert_response.status_code == 201, expert_response.text
    assert employee_response.status_code == 201, employee_response.text

    expert_token = login(client, EXPERT["email"], EXPERT["password"])
    employee_token = login(client, EMPLOYEE["email"], EMPLOYEE["password"])
    expert_headers = authorization(expert_token)
    employee_headers = authorization(employee_token)

    with SessionLocal() as db:
        stack = Stack(name="Backend")
        db.add(stack)
        db.commit()
        db.refresh(stack)
        stack_id = stack.id

    block_response = client.post(
        "/api/v1/matrices/blocks",
        json={"name": "Python", "description": "Backend competencies"},
        headers=expert_headers,
    )
    assert block_response.status_code == 201, block_response.text

    competency_response = client.post(
        "/api/v1/matrices/competencies",
        json={
            "name": "FastAPI",
            "description": "Build an HTTP API",
            "stack_id": stack_id,
            "block_id": block_response.json()["id"],
        },
        headers=expert_headers,
    )
    assert competency_response.status_code == 201, competency_response.text

    task_response = client.post(
        "/api/v1/content/tasks",
        json={
            "name": "Create an endpoint",
            "description": "Implement and document an endpoint",
            "competency_id": competency_response.json()["id"],
            "max_attempts": 2,
        },
        headers=expert_headers,
    )
    assert task_response.status_code == 201, task_response.text
    task_id = task_response.json()["id"]

    program_response = client.post(
        "/api/v1/programs/",
        json={"name": "Backend onboarding", "description": "MVP learning program"},
        headers=expert_headers,
    )
    assert program_response.status_code == 201, program_response.text
    program_id = program_response.json()["id"]

    items_response = client.put(
        f"/api/v1/programs/{program_id}/items",
        json={"items": [{"task_id": task_id, "position": 1}]},
        headers=expert_headers,
    )
    assert items_response.status_code == 200, items_response.text

    assignment_response = client.post(
        f"/api/v1/users/{employee_response.json()['id']}/programs",
        json={"program_id": program_id},
        headers=expert_headers,
    )
    assert assignment_response.status_code == 201, assignment_response.text

    return {
        "employee_id": employee_response.json()["id"],
        "employee_headers": employee_headers,
        "expert_headers": expert_headers,
        "program_id": program_id,
        "task_id": task_id,
    }


def test_employee_submission_can_be_returned_and_resubmitted(client, workflow):
    task_id = workflow["task_id"]
    employee_headers = workflow["employee_headers"]
    expert_headers = workflow["expert_headers"]

    start_response = client.post(
        f"/api/v1/assignments/{task_id}/start",
        headers=employee_headers,
    )
    assert start_response.status_code == 200
    assert start_response.json()["status"] == "in_progress"

    repeated_start = client.post(
        f"/api/v1/assignments/{task_id}/start",
        headers=employee_headers,
    )
    assert repeated_start.status_code == 409

    empty_submission = client.post(
        f"/api/v1/assignments/{task_id}/submit",
        json={},
        headers=employee_headers,
    )
    assert empty_submission.status_code == 422

    first_submission = client.post(
        f"/api/v1/assignments/{task_id}/submit",
        json={"content": "First solution"},
        headers=employee_headers,
    )
    assert first_submission.status_code == 200
    assert first_submission.json()["attempt_number"] == 1
    assert first_submission.json()["status"] == "on_review"

    queue_response = client.get(
        "/api/v1/expert/submissions",
        headers=expert_headers,
    )
    assert queue_response.status_code == 200
    assert [item["id"] for item in queue_response.json()] == [
        first_submission.json()["submission_id"]
    ]

    employee_review = client.post(
        f"/api/v1/submissions/{first_submission.json()['submission_id']}/review",
        json={"decision": "accepted"},
        headers=employee_headers,
    )
    assert employee_review.status_code == 403

    returned_response = client.post(
        f"/api/v1/submissions/{first_submission.json()['submission_id']}/review",
        json={"decision": "returned", "comment": "Add error handling"},
        headers=expert_headers,
    )
    assert returned_response.status_code == 200
    assert returned_response.json()["task_status"] == "returned"

    second_submission = client.post(
        f"/api/v1/assignments/{task_id}/submit",
        json={"content": "Improved solution"},
        headers=employee_headers,
    )
    assert second_submission.status_code == 200
    assert second_submission.json()["attempt_number"] == 2
    assert second_submission.json()["remaining_attempts"] == 0

    second_review = client.post(
        f"/api/v1/submissions/{second_submission.json()['submission_id']}/review",
        json={"decision": "returned", "comment": "Attempts exhausted"},
        headers=expert_headers,
    )
    assert second_review.status_code == 200
    assert second_review.json()["task_status"] == "needs_help"

    third_submission = client.post(
        f"/api/v1/assignments/{task_id}/submit",
        json={"content": "Third solution"},
        headers=employee_headers,
    )
    assert third_submission.status_code == 409


def test_employee_cannot_create_program(client, workflow):
    response = client.post(
        "/api/v1/programs/",
        json={"name": "Unauthorized program"},
        headers=workflow["employee_headers"],
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Недостаточно прав для выполнения данной операции"


def test_unassigned_employee_cannot_start_task(client, workflow, admin_tokens):
    outsider = {
        "fio": "Сотрудник Без Программы",
        "email": "outsider@example.com",
        "password": "outsider-test-password",
        "role_name": "Сотрудник",
    }
    create_response = client.post(
        "/api/v1/users/",
        json=outsider,
        headers=authorization(admin_tokens["access_token"]),
    )
    assert create_response.status_code == 201
    outsider_token = login(client, outsider["email"], outsider["password"])

    response = client.post(
        f"/api/v1/assignments/{workflow['task_id']}/start",
        headers=authorization(outsider_token),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Вы можете начать только задание из своей назначенной программы"


def test_duplicate_program_assignment_returns_conflict(client, workflow):
    response = client.post(
        f"/api/v1/users/{workflow['employee_id']}/programs",
        json={"program_id": workflow["program_id"]},
        headers=workflow["expert_headers"],
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Эта программа уже назначена данному сотруднику"

