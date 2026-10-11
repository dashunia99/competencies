from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

class CreateUserRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=4, max_length=32)
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        elif value in ("password", "pass1234"):
            raise ValueError("Password is too easy")
        # elif value != cls.:
        #     raise ValueError("Password can't be same as username")
        return value

class UserResponse(BaseModel):
    username: str
    email: EmailStr

class UpdateUserRequest(BaseModel):
    email: Optional[EmailStr]
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        elif value in ("password", "pass1234"):
            raise ValueError("Password is too easy")
        # elif value != cls.:
        #     raise ValueError("Password can't be same as username")
        return value

    class UserLoginRequest(BaseModel):
        email: EmailStr
        password: str