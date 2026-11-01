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
    submission_id: int
    original_name: str
    size_bytes: int
    download_url: str