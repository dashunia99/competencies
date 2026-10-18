
from fastapi import FastAPI
from core.database import engine
from app.models.base import Base
from api.learning import router as learning_router
from api.auth import router as auth_router
from api.users import router as users_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Webant Skills LMS")


# Подключаем роутеры с префиксом версии API (/api/v1)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(learning_router, prefix="/api/v1")

@app.get("/api/v1/health", tags=["Служебное"], summary="Проверка живости сервиса")
def health_check():
    return {"status": "ok"}