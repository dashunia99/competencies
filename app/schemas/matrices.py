from pydantic import BaseModel
from typing import Optional, List


# --- Схемы для CompetencyBlock ---
class CompetencyBlockBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CompetencyBlockCreate(CompetencyBlockBase):
    pass


class CompetencyBlockUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CompetencyBlockResponse(CompetencyBlockBase):
    id: int

    class Config:
        from_attributes = True  # Для Pydantic v2 можно использовать model_config = ConfigDict(from_attributes=True)


# --- Схемы для Competency ---
class CompetencyBase(BaseModel):
    name: str
    description: Optional[str] = None
    stack_id: int
    block_id: int


class CompetencyCreate(CompetencyBase):
    pass


class CompetencyResponse(CompetencyBase):
    id: int

    class Config:
        from_attributes = True