from pydantic import BaseModel, EmailStr
class UserBase(BaseModel):
    full_name: str
    email: EmailStr

class CreateUserSchema(UserBase):
    password: str

class UserSchema(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True