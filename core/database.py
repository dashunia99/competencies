from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings


# Создаем движок базы данных
engine = create_engine(settings.database_url)

# Фабрика сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей
Base = declarative_base()

# Функция получения сессии для ручек
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
