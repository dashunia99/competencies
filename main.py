from fastapi import FastAPI
from api.learning import router as learning_router
from api.auth import router as auth_router
from api.users import router as users_router
from api.competencies import router as competencies_router

from api.submissions import router as submissions_router
from api.programs import router as programs_router
from api.matrices import router as matrices_router
from api.content import router as content_router

app = FastAPI(title="Webant Skills LMS")

# Подключаем роутеры с префиксом версии API (/api/v1)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(learning_router, prefix="/api/v1")
app.include_router(programs_router, prefix="/api/v1")
app.include_router(submissions_router, prefix="/api/v1")
app.include_router(competencies_router, prefix="/api/v1")
app.include_router(matrices_router, prefix="/api/v1")
app.include_router(content_router, prefix="/api/v1")
@app.get("/api/v1/health", tags=["Служебное"], summary="Проверка живости сервиса")
def health_check():
    return {"status": "ok"}