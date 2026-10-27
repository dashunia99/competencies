from pydantic import BaseModel
from typing import Optional
from pydantic import BaseModel, Field



class TaskCreate(BaseModel):
    name: str = Field(
        ...,
        description="Название задания",
        example="Реализовать CRUD эндпоинты"
    )
    description: Optional[str] = Field(
        None,
        description="Подробное описание задачи"
    )
    competency_id: int = Field(
        ...,
        description="ID компетенции, к которой привязано задание",
        example=1
    )
    max_attempts: int = Field(
        2,
        ge=1,
        description="Количество попыток сдачи",
        example=2
    )

class TaskResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    competency_id: int
    max_attempts: int

    class Config:
        from_attributes = True


class FileUploadResponse(BaseModel):
    id: int
    object_key: str
    original_name: str
    size_bytes: int
    checksum: str
    url: Optional[str] = None