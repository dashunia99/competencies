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
    submission_id: Optional[int] = Form(None, gt=0, le=2_147_483_647),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if entity_id is not None and submission_id is not None and entity_id != submission_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID сдачи указаны неоднозначно")
    if entity_id is None:
        entity_id = submission_id
    if entity_id is not None and not 1 <= entity_id <= 2_147_483_647:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный ID связанной сущности")

    # 1. Проверка типа сущности
    if entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый entity_type. Разрешены: {', '.join(sorted(ALLOWED_ENTITY_TYPES))}",
        )

    # 2. Проверка прав пользователя (Ownership & RBAC)
    user_roles = [r.name for r in current_user.roles]
    is_privileged = "Эксперт" in user_roles or "Администратор" in user_roles

    if entity_type == "submission" and not is_privileged and "Сотрудник" not in user_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав для загрузки файла")

    if entity_type == "submission" and entity_id is not None:
        sub = db.query(Submission).filter(Submission.id == entity_id).first()
        if sub and sub.user_id != current_user.id and not is_privileged:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы не можете прикреплять файлы к чужой сдаче",
            )

    if entity_type == "material":
        if not is_privileged:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только эксперты и администраторы могут загружать файлы к материалам",
            )
        if entity_id is not None and not db.query(Material).filter(Material.id == entity_id).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Связанный материал не найден")

    # 3. Проверка расширения файла (Allowlist)
    filename = os.path.basename(file.filename or "file")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимое расширение файла. Разрешены: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # 4. Потоковое чтение чанками с подсчетом SHA-256 и контролем размера
    content = await file.read(MAX_FILE_SIZE + 1)
    size = len(content)
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Файл превышает максимально допустимый размер ({MAX_FILE_SIZE // (1024 * 1024)} МБ)",
        )

    sha256_hash = hashlib.sha256()
    sha256_hash.update(content)
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
            if not s3_service.upload_file(io.BytesIO(content), unique_key, content_type):
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Не удалось загрузить файл в S3",
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка сохранения файла в S3-хранилище: {str(e)}",
            )
    else:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="S3-хранилище недоступно")

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

    return FileUploadResponse(
        id=db_file.id,
        object_key=db_file.object_key,
        message="Файл успешно загружен",
        file_id=db_file.id,
        submission_id=entity_id,
        original_name=db_file.original_name,
        size_bytes=db_file.size_bytes,
        checksum=db_file.checksum,
        url=None,
        download_url=None,
    )


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

    user_roles = {role.name for role in current_user.roles}
    is_privileged = bool(user_roles.intersection({"Эксперт", "Администратор"}))
    if db_file.entity_type == "submission" and db_file.uploaded_by != current_user.id and not is_privileged:
        raise HTTPException(status_code=403, detail="Доступ к чужому файлу запрещен")

    if s3_service is None:
        raise HTTPException(status_code=503, detail="S3-хранилище недоступно")
    download_url = s3_service.get_presigned_url(db_file.object_key)
    if not download_url:
        raise HTTPException(status_code=503, detail="Не удалось создать ссылку на файл")
    return RedirectResponse(url=download_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/files/{file_id}/download-url")
def get_file_download_url(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_file = (
        db.query(FileModel)
        .filter(FileModel.id == file_id, FileModel.status == "uploaded")
        .first()
    )
    if not db_file or db_file.entity_type != "submission":
        raise HTTPException(status_code=404, detail="Файл не найден")

    roles = {role.name for role in current_user.roles}
    if db_file.uploaded_by != current_user.id and not roles.intersection({"Эксперт", "Администратор"}):
        raise HTTPException(status_code=403, detail="Нет доступа к этому файлу")

    if s3_service is None:
        raise HTTPException(status_code=503, detail="S3-хранилище недоступно")
    download_url = s3_service.get_presigned_url(db_file.object_key)
    if not download_url:
        raise HTTPException(status_code=502, detail="Не удалось создать ссылку на файл")

    return {"download_url": download_url}


@router.get("/submission-files")
def get_submission_files(
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_roles("Эксперт", "Администратор")),
):
    files = (
        db.query(FileModel, User)
        .join(User, FileModel.uploaded_by == User.id)
        .filter(
            FileModel.entity_type == "submission",
            FileModel.entity_id.isnot(None),
            FileModel.status == "uploaded",
        )
        .order_by(FileModel.created_at.desc())
        .all()
    )
    return [
        {
            "id": file.id,
            "submission_id": file.entity_id,
            "original_name": file.original_name,
            "size_bytes": file.size_bytes,
            "uploaded_by": user.fio,
            "uploaded_at": file.created_at,
        }
        for file, user in files
    ]
