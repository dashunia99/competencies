from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.base import User, Role, UserRole
from core.security import hash_password


def init_first_admin(db: Session) -> None:
    """
    Безопасный bootstrap первого администратора:
    1. Проверяет наличие роли "Администратор" (если нет — создает).
    2. Проверяет, есть ли уже в базе хоть один пользователь с ролью "Администратор".
    3. Если админа нет — берет email/пароль из .env, создает пользователя и выдает роль.
    4. Если админ уже есть — ничего не делает (защита от перезаписи).
    """
    admin_email = settings.initial_admin_email
    admin_password = settings.initial_admin_password.get_secret_value()

    # 1. Проверяем или создаем роль "Администратор"
    admin_role = db.query(Role).filter(Role.name == "Администратор").first()
    if not admin_role:
        admin_role = Role(name="Администратор")
        db.add(admin_role)
        db.commit()
        db.refresh(admin_role)

    # 2. Проверяем, есть ли уже хотя бы один пользователь с этой ролью
    existing_admin = (
        db.query(UserRole)
        .filter(UserRole.role_id == admin_role.id)
        .first()
    )
    if existing_admin:
        print("ℹ️ [Bootstrap] Администратор в системе уже существует. Пропускаем инициализацию.")
        return

    # 3. Проверяем, вдруг пользователь с таким email уже есть (например, без роли)
    existing_user = db.query(User).filter(User.email == admin_email).first()
    if existing_user:
        # Если юзер уже есть — просто назначаем ему роль админа
        db.add(UserRole(user_id=existing_user.id, role_id=admin_role.id))
        db.commit()
        print(f"✅ [Bootstrap] Пользователю {admin_email} назначена роль Администратор.")
        return

    # 4. Создаем нового первого Администратора с захешированным паролем
    new_admin = User(
        fio="Главный Администратор",
        email=admin_email,
        password=hash_password(admin_password),
        is_active=True,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    # 5. Привязываем роль "Администратор"
    db.add(UserRole(user_id=new_admin.id, role_id=admin_role.id))
    db.commit()

    print(f"🎉 [Bootstrap] Первый администратор успешно создан: {admin_email}")
