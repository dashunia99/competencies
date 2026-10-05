from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

#подключение к базе данных PostgreSQL

SQLALCHEMY_DATABASE_USL = "postgresql://postgres:твои_пароль@localhost:5432/webant_skills"

engine = create_engine(SQLALCHEMY_DATABASE_USL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()