from typing import List, Optional
from pydantic import BaseModel, root_validator


class ProgramCreateSchema(BaseModel):
    name: str
    description: Optional[str] = None


class ProgramUpdateSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProgramItemInputSchema(BaseModel):
    material_id: Optional[int] = None
    task_id: Optional[int] = None
    position: int = 0

    @root_validator(pre=True)
    def check_only_one_target(cls, values):
        mat = values.get("material_id")
        task = values.get("task_id")
        if (mat is None and task is None) or (mat is not None and task is not None):
            raise ValueError("В элементе программы должно быть заполнено ровно одно поле: material_id или task_id")
        return values


class SetProgramItemsSchema(BaseModel):
    items: List[ProgramItemInputSchema]


class ProgramItemResponseSchema(BaseModel):
    id: int
    type: str  # "material" или "task"
    item_id: int
    name: str
    position: int


class ProgramDetailSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    creator_id: Optional[int] = None
    items: List[ProgramItemResponseSchema] = []

    class Config:
        from_attributes = True


class ProgramShortSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True