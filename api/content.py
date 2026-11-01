import uuid
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.s3_client import s3_service  # Твой готовый клиент!
from core.security import get_current_user, require_roles
from app.models.base import Task, File as FileModel, User
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
    submission_id: int = Form(..., gt=0, le=2_147_483_647),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if "Сотрудник" not in [role.name for role in current_user.roles]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Прикреплять файлы к заданию могут только сотрудники",
        )

    max_size = 50 * 1024 * 1024
    if file.size is not None and file.size > max_size:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 50 МБ)")

    content = await file.read(max_size + 1)
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 50 МБ)")

    original_name = Path(file.filename or "file").name
    suffix = Path(original_name).suffix
    object_key = f"submissions/{uuid.uuid4()}{suffix}"
    content_type = file.content_type or "application/octet-stream"

    success = s3_service.upload_file(
        file_obj=BytesIO(content),
        object_key=object_key,
        content_type=content_type,
    )
    if not success:
        raise HTTPException(status_code=500, detail="Ошибка загрузки файла в S3")

    download_url = s3_service.get_presigned_url(object_key)
    if not download_url:
        raise HTTPException(status_code=502, detail="Не удалось создать ссылку на загруженный файл")

    db_file = FileModel(
        object_key=object_key,
        bucket=s3_service.bucket,
        original_name=original_name,
        mime_type=content_type,
        size_bytes=len(content),
        entity_type="submission",
        entity_id=submission_id,
        uploaded_by=current_user.id,
        status="uploaded",
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return FileUploadResponse(
        message="Файл успешно загружен",
        file_id=db_file.id,
        submission_id=submission_id,
        original_name=db_file.original_name,
        size_bytes=db_file.size_bytes,
        download_url=download_url,
    )


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