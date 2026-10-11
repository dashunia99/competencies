from typing import Optional
from pydantic import BaseModel, EmailStr


class CreateUserSchema(BaseModel):
    fio: str
    email: EmailStr
    password: str
    role_name: Optional[str] = "Сотрудник"  # Можно указать: Администратор, Эксперт, Сотрудник
    grade_id: Optional[int] = None


class UserSchema(BaseModel):
    id: int
    fio: str
    email: EmailStr
    role: Optional[str] = None
    stack: Optional[str] = None
    grade: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


UserMeSchema = UserSchema