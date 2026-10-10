from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from models.users import UserRole


# Схема для создания пользователя
class CreateUserSchema(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.EMPLOYEE
    direction: Optional[str] = None
    grade: Optional[str] = None


# Схема для возврата данных пользователя
class UserSchema(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    direction: Optional[str] = None
    grade: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True  # Позволяет считывать данные напрямую из SQLAlchemy-модели