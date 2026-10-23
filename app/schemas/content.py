from pydantic import BaseModel
from typing import Optional


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    stack_id: int
    max_attempts: int = 2


class TaskResponse(TaskCreate):
    id: int

    class Config:
        from_attributes = True


class FileUploadResponse(BaseModel):
    message: str
    file_id: int
    download_url: str  # Ссылка, которую вернет твой s3_client