from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


# Схема программы в списке программ пользователя
class ProgramSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


# Схема материала
class MaterialSchema(BaseModel):
    id: int
    name: str
    link: Optional[str] = None
    competency_id: int

    class Config:
        from_attributes = True


# Схема краткого описания задания внутри темы
class TaskShortSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    competency_id: int

    class Config:
        from_attributes = True


# Схема темы (компетенции) со всеми вложенными материалами и заданиями
class TopicDetailSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    materials: List[MaterialSchema] = []
    tasks: List[TaskShortSchema] = []


# Схема детальной карточки программы со списком тем
class ProgramDetailSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    topics: List[TopicDetailSchema] = []


# Схема задания и его статуса выполнения
class AssignmentStatusSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None