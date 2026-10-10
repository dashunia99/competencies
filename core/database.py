from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Строка подключения к PostgreSQL (замени ТВОЙ_ПАРОЛЬ на реальный пароль от базы)
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:223112@localhost:5432/webant_skills"

# Создаем движок базы данных
engine = create_engine(SQLALCHEMY_DATABASE_URL)

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