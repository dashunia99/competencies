from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.database import engine, SessionLocal, get_db
from app.models.base import Base
from core.init_db import init_first_admin

from api.auth import router as auth_router
from api.users import router as users_router
from api.learning import router as learning_router
from api.programs import router as programs_router
from api.submissions import router as submissions_router
from api.competencies import router as competencies_router
from api.matrices import router as matrices_router
from api.content import router as content_router

# Создаем таблицы в БД (если их еще нет)
Base.metadata.create_all(bind=engine)


# Жизненный цикл приложения (Lifespan)
@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Код при старте: инициализация первого администратора
    db = SessionLocal()
    try:
        init_first_admin(db)
    finally:
        db.close()

    yield  # Сервер работает и принимает запросы


tags_metadata = [
    {"name": "Аутентификация", "description": "Вход в систему и получение токенов"},
    {"name": "Пользователи", "description": "Управление учетными записями и назначениями"},
    {"name": "Личный кабинет и задания", "description": "Кабинет сотрудника, учебные материалы и старт заданий"},
    {"name": "Программы обучения", "description": "Создание и редактирование программ обучения (Эксперт)"},
    {"name": "Сдача и проверка заданий", "description": "Отправка решений сотрудниками и проверка экспертами"},
    {"name": "Справочники и матрица компетенций", "description": "Направления, грейды и дерево матрицы"},
    {"name": "Служебное", "description": "Проверка состояния сервиса"},
]

app = FastAPI(
    title="Webant Skills LMS",
    description="Backend API для системы управления компетенциями и обучения",
    version="1.0.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)

# Подключаем роутеры
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(learning_router, prefix="/api/v1")
app.include_router(programs_router, prefix="/api/v1")
app.include_router(submissions_router, prefix="/api/v1")
app.include_router(competencies_router, prefix="/api/v1")
app.include_router(matrices_router, prefix="/api/v1")
app.include_router(content_router, prefix="/api/v1")


# Честная проверка жизнеспособности (проверяем жива ли база данных)
@app.get("/api/v1/health", tags=["Служебное"], summary="Проверка живости сервиса")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "database": db_status,
    }