from tests.conftest import authorization


def test_admin_can_login_refresh_token_and_read_profile(client, admin_tokens):
    profile_response = client.get(
        "/api/v1/auth/me",
        headers=authorization(admin_tokens["access_token"]),
    )

    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == "admin@example.com"
    assert profile_response.json()["role"] == "Администратор"

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": admin_tokens["refresh_token"]},
    )

    assert refresh_response.status_code == 200
    assert refresh_response.json()["token_type"] == "bearer"
    assert refresh_response.json()["access_token"]


def test_login_rejects_invalid_password(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "incorrect-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Неверный email или пароль"


def test_protected_endpoint_rejects_missing_token(client):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401

