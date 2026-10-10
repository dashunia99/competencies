from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import hash_password  # 👈 1. Импортируем нашу функцию хеширования
from models.users import User
from schemas.users import CreateUserSchema, UserSchema

router = APIRouter(prefix="/users", tags=["Пользователи"])


@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: CreateUserSchema,
    db: Session = Depends(get_db)
):
    # 2. Проверяем, не занят ли уже такой email (хорошая практика)
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )

    user_dict = user_data.model_dump()

    # 3. Создаем модель пользователя, но пароль обязательно хешируем
    new_user = User(
        full_name=user_dict["full_name"],
        email=user_dict["email"],
        password_hash=hash_password(user_dict["password"])  # Хешируем ДО сохранения в БД
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user