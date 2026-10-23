from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from app.models.base import User, Stack, Grade, CompetencyBlock, Competency

router = APIRouter(prefix="", tags=["Справочники и матрица компетенций"])


# ----------------- СХЕМЫ -----------------
class SimpleItemSchema(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class CompetencySchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    level: Optional[int] = None

    class Config:
        from_attributes = True


class SectionSchema(BaseModel):
    id: int
    name: str
    competencies: List[CompetencySchema] = []


class ThemeSchema(BaseModel):
    id: int
    name: str
    sections: List[SectionSchema] = []


class CompetencyMatrixResponse(BaseModel):
    stack_id: int
    stack_name: str
    matrix: List[ThemeSchema]


# ----------------- ЭНДПОИНТЫ -----------------

# 1. Список всех стеков/направлений
@router.get("/directions", response_model=List[SimpleItemSchema], summary="Список направлений/стеков")
def get_directions(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    return db.query(Stack).all()


# 2. Список грейдов
@router.get("/grades", response_model=List[SimpleItemSchema], summary="Список грейдов")
def get_grades(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    return db.query(Grade).all()


# 3. Карточка конкретной компетенции
@router.get("/competencies/{competency_id}", response_model=CompetencySchema, summary="Карточка компетенции")
def get_competency(
        competency_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    comp = db.query(Competency).filter(Competency.id == competency_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Компетенция не найдена")
    return comp


# 4. МАТРИЦА КОМПЕТЕНЦИЙ ДЛЯ НАПРАВЛЕНИЯ (Дерево: Темы -> Разделы -> Навыки)
@router.get(
    "/directions/{direction_id}/competency-matrix",
    response_model=CompetencyMatrixResponse,
    summary="Матрица компетенций выбранного направления",
)
def get_competency_matrix(
        direction_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    stack = db.query(Stack).filter(Stack.id == direction_id).first()
    if not stack:
        raise HTTPException(status_code=404, detail="Направление не найдено")

    # 1. Достаем корневые блоки (Темы: parent_id IS NULL)
    themes = db.query(CompetencyBlock).filter(CompetencyBlock.parent_id.is_(None)).all()

    matrix_res = []
    for theme in themes:
        # 2. Достаем дочерние блоки (Разделы: parent_id == theme.id)
        sections = db.query(CompetencyBlock).filter(CompetencyBlock.parent_id == theme.id).all()

        sections_res = []
        for section in sections:
            # 3. Достаем навыки, привязанные к этому разделу и этому стеку
            competencies = db.query(Competency).filter(
                Competency.block_id == section.id,
                Competency.stack_id == direction_id,
            ).all()

            sections_res.append({
                "id": section.id,
                "name": section.name,
                "competencies": competencies,
            })

        matrix_res.append({
            "id": theme.id,
            "name": theme.name,
            "sections": sections_res,
        })

    return {
        "stack_id": stack.id,
        "stack_name": stack.name,
        "matrix": matrix_res,
    }