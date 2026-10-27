import hashlib
import io
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user, require_roles
from app.models.base import (
    User,
    Task,
    File as FileModel,
    Competency,
    Material,
    Submission,
)
from app.schemas.content import TaskCreate, TaskResponse, FileUploadResponse

# Пытаемся импортировать клиент S3 (если развернут)
try:
    from app.core.s3_client import s3_service
except ImportError:
    s3_service = None

router = APIRouter(prefix="/content", tags=["Контент и файлы"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {"pdf", "docx", "xlsx", "pptx", "png", "jpg", "jpeg", "zip"}
ALLOWED_ENTITY_TYPES = {"submission", "material", "hr_matrix"}


# ==========================================
# 1. СОЗДАНИЕ ЗАДАНИЯ (ТОЛЬКО ЭКСПЕРТ И АДМИН)
# ==========================================
@router.post(
    "/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать задание (только Эксперт и Админ)",
    dependencies=[Depends(require_roles("Эксперт", "Администратор"))],
)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Проверяем существование связанной компетенции в БД (защита от 500 ошибки внешнего ключа)
    competency = db.query(Competency).filter(Competency.id == task_in.competency_id).first()
    if not competency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Компетенция с id={task_in.competency_id} не найдена",
        )

    # 2. Создаем задание с правильными полями модели
    db_task = Task(
        name=task_in.name.strip(),
        description=task_in.description,
        competency_id=competency.id,
        max_attempts=task_in.max_attempts,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    return db_task


# ==========================================
# 2. БЕЗОПАСНАЯ ЗАГРУЗКА ФАЙЛА В S3/MINIO
# ==========================================
@router.post(
    "/upload",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Загрузить файл в хранилище S3/MinIO",
)
async def upload_file(
    file: UploadFile = File(...),
    entity_type: str = Form("submission"),
    entity_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Проверка типа сущности
    if entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый entity_type. Разрешены: {', '.join(sorted(ALLOWED_ENTITY_TYPES))}",
        )

    # 2. Проверка прав пользователя (Ownership & RBAC)
    user_roles = [r.name for r in current_user.roles]
    is_privileged = "Эксперт" in user_roles or "Администратор" in user_roles

    if entity_type == "submission" and entity_id is not None:
        sub = db.query(Submission).filter(Submission.id == entity_id).first()
        if not sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Связанная сдача не найдена")
        if sub.user_id != current_user.id and not is_privileged:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы не можете прикреплять файлы к чужой сдаче",
            )

    elif entity_type == "material" and entity_id is not None:
        mat = db.query(Material).filter(Material.id == entity_id).first()
        if not mat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Связанный материал не найден")
        if not is_privileged:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только эксперты и администраторы могут загружать файлы к материалам",
            )

    # 3. Проверка расширения файла (Allowlist)
    filename = file.filename or "file"
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимое расширение файла. Разрешены: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # 4. Потоковое чтение чанками с подсчетом SHA-256 и контролем размера
    size = 0
    sha256_hash = hashlib.sha256()
    file_buffer = io.BytesIO()

    while True:
        chunk = await file.read(1024 * 1024)  # Читаем чанками по 1 МБ
        if not chunk:
            break
        size += len(chunk)
        if size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Файл превышает максимально допустимый размер ({MAX_FILE_SIZE // (1024 * 1024)} МБ)",
            )
        sha256_hash.update(chunk)
        file_buffer.write(chunk)

    file_buffer.seek(0)
    checksum = sha256_hash.hexdigest()

    # 5. Генерация уникального ключа в S3
    prefix = f"{entity_type}s"
    unique_key = f"{prefix}/{uuid.uuid4()}.{ext}"

    # Определение бакета
    bucket = (
        getattr(s3_service, "bucket", None)
        or getattr(s3_service, "bucket_name", None)
        or os.getenv("S3_BUCKET_NAME", "webant-skills")
    )

    # 6. Загрузка в S3/MinIO
    if s3_service is not None:
        try:
            content_type = file.content_type or "application/octet-stream"
            if hasattr(s3_service, "upload_fileobj"):
                s3_service.upload_fileobj(file_buffer, unique_key, content_type=content_type)
            elif hasattr(s3_service, "client"):
                s3_service.client.upload_fileobj(
                    file_buffer,
                    bucket,
                    unique_key,
                    ExtraArgs={"ContentType": content_type},
                )
            elif hasattr(s3_service, "upload_file"):
                s3_service.upload_file(file_buffer, unique_key)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка сохранения файла в S3-хранилище: {str(e)}",
            )
    else:
        print(f"⚠️ [S3 Info] Файл зарегистрирован: {unique_key}")

    # 7. Сохранение метаданных в PostgreSQL (uploaded_by берется СТРОГО из JWT токена!)
    db_file = FileModel(
        object_key=unique_key,
        bucket=bucket,
        original_name=filename,
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=size,
        uploaded_by=current_user.id,
        entity_type=entity_type,
        entity_id=entity_id,
        status="uploaded",
        checksum=checksum,
        version=1,
    )
    db.add(db_file)

    if entity_type == "submission" and entity_id is not None:
        submission_obj = db.query(Submission).filter(Submission.id == entity_id).first()
        if submission_obj:
            submission_obj.file_key = unique_key

    db.commit()
    db.refresh(db_file)

    # 8. Генерация временной ссылки для скачивания (pre-signed URL)
    download_url = None
    if s3_service is not None:
        try:
            if hasattr(s3_service, "get_presigned_url"):
                download_url = s3_service.get_presigned_url(unique_key)
            elif hasattr(s3_service, "generate_presigned_url"):
                download_url = s3_service.generate_presigned_url(unique_key)
            elif hasattr(s3_service, "client"):
                download_url = s3_service.client.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={"Bucket": bucket, "Key": unique_key},
                    ExpiresIn=900,
                )
        except Exception:
            download_url = None

    return {
        "id": db_file.id,
        "object_key": db_file.object_key,
        "original_name": db_file.original_name,
        "size_bytes": db_file.size_bytes,
        "checksum": db_file.checksum,
        "url": download_url,
    }


# ==========================================
# 3. ПОЛУЧЕНИЕ / СКАЧИВАНИЕ ФАЙЛА
# ==========================================
@router.get(
    "/files/{file_id}/download",
    summary="Получить временную ссылку на скачивание файла",
)
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_file = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not db_file or db_file.status == "deleted":
        raise HTTPException(status_code=404, detail="Файл не найден")

    # Проверка прав: сотрудник может скачать только свои файлы или материалы
    user_roles = [r.name for r in current_user.roles]
    is_privileged = "Эксперт" in user_roles or "Администратор" in user_roles

    if not is_privileged and db_file.entity_type == "submission" and db_file.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Доступ к чужому файлу запрещен")

    bucket = db_file.bucket or os.getenv("S3_BUCKET_NAME", "webant-skills")
    download_url = None

    if s3_service is not None:
        try:
            if hasattr(s3_service, "get_presigned_url"):
                download_url = s3_service.get_presigned_url(db_file.object_key)
            elif hasattr(s3_service, "generate_presigned_url"):
                download_url = s3_service.generate_presigned_url(db_file.object_key)
            elif hasattr(s3_service, "client"):
                download_url = s3_service.client.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={"Bucket": bucket, "Key": db_file.object_key},
                    ExpiresIn=900,
                )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ошибка генерации ссылки S3: {str(e)}")

    if not download_url:
        raise HTTPException(status_code=503, detail="Хранилище S3 временно недоступно для выдачи ссылки")

    return RedirectResponse(url=download_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)