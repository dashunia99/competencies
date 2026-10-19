from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


# 1. Схема материала
class MaterialSchema(BaseModel):
    id: int
    name: str
    link: Optional[str] = None
    competency_id: int

    class Config:
        from_attributes = True


# 2. Схема краткого описания задания внутри темы (добавили max_attempts)
class TaskShortSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    competency_id: int
    max_attempts: int = 2

    class Config:
        from_attributes = True


# 3. Схема темы (компетенции) со всеми вложенными материалами и заданиями
class TopicDetailSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    materials: List[MaterialSchema] = []
    tasks: List[TaskShortSchema] = []


# 4. Программа обучения с темами для личного кабинета
class ProgramWithTopicsSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: Optional[str] = None
    topics: List[TopicDetailSchema] = []


# 5. Сведения о пользователе в шапке кабинета
class CabinetUserInfoSchema(BaseModel):
    id: int
    fio: str
    email: str
    role: Optional[str] = None
    stack: Optional[str] = None
    grade: Optional[str] = None


# 6. Главная схема личного кабинета (COMP-27)
class CabinetOverviewSchema(BaseModel):
    user_info: CabinetUserInfoSchema
    assigned_programs: List[ProgramWithTopicsSchema] = []


# 7. Схема задания и его статуса выполнения (добавили max_attempts)
class AssignmentStatusSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    max_attempts: int = 2

    class Config:
        from_attributes = True


# --- Старые схемы (сохранены для обратной совместимости) ---
class ProgramSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class ProgramDetailSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    topics: List[TopicDetailSchema] = []