from app.core.security import get_password_hash, verify_password
from app.models.users import User  # Твоя модель SQLAlchemy
from sqlalchemy.orm import Session


def register_user(session: Session, email: str, raw_password: str):
    # 1. Хэшируем пароль
    hashed_pwd = get_password_hash(raw_password)

    # 2. Создаем пользователя
    new_user = User(email=email, password=hashed_pwd, fio="Новый Стажер")

    # 3. Сохраняем в БД
    session.add(new_user)
    session.commit()
    session.refresh(new_user)  # Обновляем объект, чтобы получить его ID из базы

    return new_user


def login_user(session: Session, email: str, input_password: str):
    # 1. Ищем пользователя
    user = session.query(User).filter(User.email == email).first()

    # 2. Проверяем существование пользователя и совпадение паролей
    if not user or not verify_password(input_password, user.password):
        return None  # Или можно выбросить ошибку (Exception)

    return user