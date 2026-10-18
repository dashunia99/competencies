from typing import List, Optional
from pydantic import BaseModel


# Схема создания/редактирования программы
class ProgramCreateSchema(BaseModel):
    name: str
    description: Optional[str] = None


# Схема одного элемента (для добавления в программу)
class ProgramItemInputSchema(BaseModel):
    competency_id: int
    order_index: int = 0


# Схема для PUT /programs/{id}/items (замена состава)
class SetProgramItemsSchema(BaseModel):
    items: List[ProgramItemInputSchema]


# Элемент программы в ответе
class ProgramItemResponseSchema(BaseModel):
    id: int
    competency_id: int
    competency_name: str
    order_index: int

    class Config:
        from_attributes = True


# Детальная карточка программы со списком тем/компетенций
class ProgramDetailSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    items: List[ProgramItemResponseSchema] = []

    class Config:
        from_attributes = True


# Краткая карточка программы для списка
class ProgramShortSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

# ==========================================
# СХЕМЫ ДЛЯ НАЗНАЧЕНИЯ ПРОГРАММЫ (COMP-26)
# ==========================================

class AssignProgramSchema(BaseModel):
    """Тело запроса: ID пользователя, которому назначаем программу."""
    user_id: int


class ProgramAssignmentResponseSchema(BaseModel):
    """Ответ сервера после успешного назначения."""
    user_id: int
    program_id: int
    program_name: str
    status: str

    class Config:
        from_attributes = True