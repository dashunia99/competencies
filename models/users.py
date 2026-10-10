import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum, func
from core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EXPERT = "expert"
    EMPLOYEE = "employee"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)

    role = Column(
        SQLEnum(UserRole, name="user_role_enum"),
        default=UserRole.EMPLOYEE,
        nullable=False
    )
    direction = Column(String, nullable=True)  # Стек / направление (например, "Python", "Frontend")
    grade = Column(String, nullable=True)  # Грейд (например, "Junior", "Middle")

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())