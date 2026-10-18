from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

class CreateUserRequest(BaseModel):
    fio: str = Field(min_length=2, max_length=255)  # <-- было username
    email: EmailStr
    password: str
    grade_id: Optional[int] = None  # <-- добавлено
    stack_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        elif value in ("password", "pass1234"):
            raise ValueError("Password is too easy")
        return value

class UserResponse(BaseModel):
    id: int  # <-- добавлено
    fio: str  # <-- было username
    email: EmailStr
    grade_id: Optional[int] = None  # <-- добавлено
    stack_id: Optional[int] = None

    class Config:
        from_attributes = True  # <-- добавлено для работы с ORM

class UpdateUserRequest(BaseModel):
    fio: Optional[str] = None  # <-- было username
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    grade_id: Optional[int] = None  # <-- добавлено
    stack_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if value is not None:  # <-- добавлено, чтобы не падал на None
            if len(value) < 8:
                raise ValueError("Password must be at least 8 characters")
            elif value in ("password", "pass1234"):
                raise ValueError("Password is too easy")
        return value

class UserLoginRequest(BaseModel):  # <-- вынесен на верхний уровень
    email: EmailStr
    password: str