from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user, require_roles
from app.models.base import CompetencyBlock, Competency, Stack, User
from app.schemas.matrices import (
    CompetencyBlockCreate,
    CompetencyBlockUpdate,
    CompetencyBlockResponse,
    CompetencyCreate,
    CompetencyResponse,
)

# Префикс /matrices (в main.py роутер подключается с /api/v1)
router = APIRouter(prefix="/matrices", tags=["Матрицы компетенций"])


# ==========================================
# БЛОКИ КОМПЕТЕНЦИЙ (ТЕМЫ И РАЗДЕЛЫ)
# ==========================================

@router.get(
    "/blocks",
    response_model=List[CompetencyBlockResponse],
    summary="Получить список всех блоков матрицы",
)
def get_all_blocks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Доступно всем авторизованным пользователям."""
    return db.query(CompetencyBlock).all()


@router.post(
    "/blocks",
    response_model=CompetencyBlockResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать блок компетенций (только Эксперт и Админ)",
)
def create_block(
    block: CompetencyBlockCreate,
    db: Session = Depends(get_db),
    expert: User = Depends(require_roles("Эксперт", "Администратор")),
):
    # Защита 3.3: проверяем существование родительского блока, если он указан
    if block.parent_id is not None:
        parent = db.query(CompetencyBlock).filter(CompetencyBlock.id == block.parent_id).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Родительский блок с id={block.parent_id} не найден",
            )

    db_block = CompetencyBlock(**block.model_dump())
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return db_block


@router.put(
    "/blocks/{block_id}",
    response_model=CompetencyBlockResponse,
    summary="Обновить блок компетенций (только Эксперт и Админ)",
)
def update_block(
    block_id: int,
    block_update: CompetencyBlockUpdate,
    db: Session = Depends(get_db),
    expert: User = Depends(require_roles("Эксперт", "Администратор")),
):
    db_block = db.query(CompetencyBlock).filter(CompetencyBlock.id == block_id).first()
    if not db_block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Блок не найден",
        )

    # Защита от зацикливания дерева: блок не может быть своим же родителем
    if block_update.parent_id is not None:
        if block_update.parent_id == block_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Блок не может ссылаться на самого себя как на родителя",
            )
        parent = db.query(CompetencyBlock).filter(CompetencyBlock.id == block_update.parent_id).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Родительский блок с id={block_update.parent_id} не найден",
            )

    update_data = block_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_block, key, value)

    db.commit()
    db.refresh(db_block)
    return db_block


@router.delete(
    "/blocks/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить блок компетенций (только Эксперт и Админ)",
)
def delete_block(
    block_id: int,
    db: Session = Depends(get_db),
    expert: User = Depends(require_roles("Эксперт", "Администратор")),
):
    db_block = db.query(CompetencyBlock).filter(CompetencyBlock.id == block_id).first()
    if not db_block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Блок не найден",
        )

    db.delete(db_block)
    db.commit()
    return None


# ==========================================
# КОМПЕТЕНЦИИ (НАВЫКИ)
# ==========================================

@router.post(
    "/competencies",
    response_model=CompetencyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать компетенцию (только Эксперт и Админ)",
)
def create_competency(
    comp: CompetencyCreate,
    db: Session = Depends(get_db),
    expert: User = Depends(require_roles("Эксперт", "Администратор")),
):
    # Защита 3.3: предварительная проверка внешних ключей, чтобы не ронять БД в 500
    if getattr(comp, "block_id", None) is not None:
        block = db.query(CompetencyBlock).filter(CompetencyBlock.id == comp.block_id).first()
        if not block:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Блок компетенций с id={comp.block_id} не найден",
            )

    if getattr(comp, "stack_id", None) is not None:
        stack = db.query(Stack).filter(Stack.id == comp.stack_id).first()
        if not stack:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Стек/направление с id={comp.stack_id} не найдено",
            )

    db_comp = Competency(**comp.model_dump())
    db.add(db_comp)
    db.commit()
    db.refresh(db_comp)
    return db_comp


@router.get(
    "/competencies",
    response_model=List[CompetencyResponse],
    summary="Получить список компетенций (с фильтром по стеку)",
)
def get_competencies(
    stack_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Доступно всем авторизованным пользователям."""
    query = db.query(Competency)
    if stack_id is not None:
        query = query.filter(Competency.stack_id == stack_id)
    return query.all()