import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.database import SessionLocal
from core.security import hash_password
from app.models.base import Role, User, UserRole
from app.roles import ROLE_NAMES


TEST_ACCOUNTS = (
    ("ui-expert@webant.ru", "Тестовый Эксперт", "Эксперт"),
    ("ui-employee@webant.ru", "Тестовый Сотрудник", "Сотрудник"),
)


def seed_test_accounts() -> None:
    db = SessionLocal()
    created_credentials = []
    try:
        roles = {}
        for role_name in ROLE_NAMES:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name)
                db.add(role)
                db.flush()
            roles[role_name] = role

        for email, fio, role_name in TEST_ACCOUNTS:
            if db.query(User).filter(User.email == email).first():
                print(f"{email}: уже существует, учетные данные не изменены.")
                continue

            password = secrets.token_urlsafe(18)
            user = User(
                fio=fio,
                email=email,
                password_hash=hash_password(password),
                is_active=True,
            )
            db.add(user)
            db.flush()
            db.add(UserRole(user_id=user.id, role_id=roles[role_name].id))
            created_credentials.append((email, password, role_name))

        db.commit()
        for email, password, role_name in created_credentials:
            print(f"{role_name}: {email} / {password}")
        if not created_credentials:
            print("Новые тестовые учетные записи не созданы.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_test_accounts()
