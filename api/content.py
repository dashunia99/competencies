import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.s3_client import s3_service  # Твой готовый клиент!
from app.models.base import Task, File as FileModel
from app.schemas.content import TaskCreate, TaskResponse, FileUploadResponse

router = APIRouter(prefix="/api/v1/content", tags=["Content"])


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
        file: UploadFile = File(...),
        entity_type: str = "submission",  # submission или material
        entity_id: int = None,
        current_user_id: int = 1,  # TODO: заменить на получение ID из JWT токена
        db: Session = Depends(get_db)
):
    # 1. Проверка размера (берем из настроек, если есть, или хардкод 50МБ)
    MAX_SIZE = 50 * 1024 * 1024
    if file.size and file.size > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 50 МБ)")

    # 2. Генерация уникального имени
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    object_key = f"{entity_type}s/{uuid.uuid4()}.{ext}"

    # 3. Загрузка в S3 через твой сервис!
    # Убедись, что твой s3_service имеет метод upload_file(file_obj, object_key, content_type)
    success = s3_service.upload_file(file.file, object_key, file.content_type)
    if not success:
        raise HTTPException(status_code=500, detail="Ошибка загрузки файла в S3")

    # 4. Генерация временной ссылки для скачивания
    download_url = s3_service.get_presigned_url(object_key)

    # 5. Сохранение метаданных в БД
    db_file = FileModel(
        object_key=object_key,
        bucket=s3_service.bucket_name,  # или как называется поле в твоем s3_client
        original_name=file.filename,
        mime_type=file.content_type,
        size_bytes=file.size,
        entity_type=entity_type,
        entity_id=entity_id,
        uploaded_by=current_user_id,
        status="uploaded"
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return FileUploadResponse(
        message="Файл успешно загружен",
        file_id=db_file.id,
        download_url=download_url
    )