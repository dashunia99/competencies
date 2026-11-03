from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.base import Base


# Создаем движок базы данных
engine = create_engine(settings.database_url)

# Фабрика сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Функция получения сессии для ручек
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
