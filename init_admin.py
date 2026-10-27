import os
import sys
from core.database import SessionLocal
from core.security import hash_password
from app.models.base import Role, User, UserRole

def init_admin():
    admin_email = os.getenv("INITIAL_ADMIN_EMAIL")
    admin_password = os.getenv("INITIAL_ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        print("[INIT-ADMIN] INITIAL_ADMIN_EMAIL или INITIAL_ADMIN_PASSWORD не заданы. Пропуск.")
        return

    db = SessionLocal()
    try:
        # 1. Проверяем / создаем роль 'Администратор'
        admin_role = db.query(Role).filter_by(name="Администратор").first()
        if not admin_role:
            admin_role = Role(name="Администратор")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
            print("[INIT-ADMIN] Роль 'Администратор' создана.")

        # 2. Проверяем существование пользователя по email
        user = db.query(User).filter_by(email=admin_email).first()
        hashed_pwd = hash_password(admin_password)
        pwd_field = "password_hash" if hasattr(User, "password_hash") else "password"

        if not user:
            user = User(
                fio="Администратор Системы",
                email=admin_email,
                is_active=True
            )
            setattr(user, pwd_field, hashed_pwd)
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"[INIT-ADMIN] Пользователь {admin_email} успешно создан.")
        else:
            setattr(user, pwd_field, hashed_pwd)
            user.is_active = True
            db.commit()
            print(f"[INIT-ADMIN] Пользователь {admin_email} уже существует, пароль и активность актуализированы.")

        # 3. Назначаем роль администратора без дубликатов
        existing_assignment = db.query(UserRole).filter_by(
            user_id=user.id, role_id=admin_role.id
        ).first()

        if not existing_assignment:
            db.add(UserRole(user_id=user.id, role_id=admin_role.id))
            db.commit()
            print(f"[INIT-ADMIN] Роль 'Администратор' успешно назначена пользователю {admin_email}.")
        else:
            print(f"[INIT-ADMIN] У пользователя {admin_email} уже назначена роль администратора.")

        print("[INIT-ADMIN] Инициализация завершена успешно.")

    except Exception as e:
        db.rollback()
        print(f"[INIT-ADMIN] Ошибка инициализации: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    init_admin()