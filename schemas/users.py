from datetime import date
from typing import Optional
from pydantic import BaseModel, EmailStr


# 1. Принимаем все поля по ТЗ COMP-17
class CreateUserSchema(BaseModel):
    fio: str
    email: EmailStr
    password: str
    position: Optional[str] = None      # Должность
    start_date: Optional[date] = None   # Дата начала работы (формат YYYY-MM-DD)
    stack_id: Optional[int] = None      # ID стека
    grade_id: Optional[int] = None      # ID грейда
    role_name: Optional[str] = None     # Роль (Сотрудник, Эксперт, Администратор)


# 2. Отдаем расширенный профиль по ТЗ COMP-17
class UserSchema(BaseModel):
    id: int
    fio: str
    email: EmailStr
    position: Optional[str] = None      # Должность
    start_date: Optional[date] = None   # Дата начала работы
    role: Optional[str] = None
    stack: Optional[str] = None
    grade: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


# Синоним для совместимости
UserMeSchema = UserSchema

class UpdateUserSchema(BaseModel):
    fio: Optional[str] = None
    position: Optional[str] = None
    start_date: Optional[date] = None
    stack_id: Optional[int] = None      # Изменение направления
    grade_id: Optional[int] = None      # Изменение грейда
    role_name: Optional[str] = None     # Изменение роли