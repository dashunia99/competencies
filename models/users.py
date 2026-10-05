from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from core.database import Base

class User(Base):

    __tablename__ = "users"

id = Column(Integer, primary_key=True, index=True)
full_name= Column(String, mullable=False)
email = Column(String, unique=True, nullable=False, index=True)
password_hash = Column(String, nullable=False)
is_active = Column(Boolean, default=True)

created_at = Column(DateTime, server_default=func.now())


