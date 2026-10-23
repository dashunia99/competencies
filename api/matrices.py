from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from app.models.base import CompetencyBlock, Competency
from app.schemas.matrices import (
    CompetencyBlockCreate, CompetencyBlockUpdate, CompetencyBlockResponse,
    CompetencyCreate, CompetencyResponse
)

router = APIRouter(prefix="/api/v1/matrices", tags=["Matrices"])


# --- CompetencyBlock Endpoints ---

@router.get("/blocks", response_model=list[CompetencyBlockResponse])
def get_all_blocks(db: Session = Depends(get_db)):
    # Возвращаем все блоки (можно добавить фильтр parent_id=None для корневых)
    return db.query(CompetencyBlock).all()


@router.post("/blocks", response_model=CompetencyBlockResponse, status_code=status.HTTP_201_CREATED)
def create_block(block: CompetencyBlockCreate, db: Session = Depends(get_db)):
    db_block = CompetencyBlock(**block.model_dump())  # или block.dict() для Pydantic v1
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return db_block


@router.put("/blocks/{block_id}", response_model=CompetencyBlockResponse)
def update_block(block_id: int, block_update: CompetencyBlockUpdate, db: Session = Depends(get_db)):
    db_block = db.query(CompetencyBlock).filter(CompetencyBlock.id == block_id).first()
    if not db_block:
        raise HTTPException(status_code=404, detail="Блок не найден")

    update_data = block_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_block, key, value)

    db.commit()
    db.refresh(db_block)
    return db_block


@router.delete("/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_block(block_id: int, db: Session = Depends(get_db)):
    db_block = db.query(CompetencyBlock).filter(CompetencyBlock.id == block_id).first()
    if not db_block:
        raise HTTPException(status_code=404, detail="Блок не найден")
    db.delete(db_block)
    db.commit()
    return None


# --- Competency Endpoints ---

@router.post("/competencies", response_model=CompetencyResponse, status_code=status.HTTP_201_CREATED)
def create_competency(comp: CompetencyCreate, db: Session = Depends(get_db)):
    # Здесь можно добавить проверку, что block_id и stack_id существуют
    db_comp = Competency(**comp.model_dump())
    db.add(db_comp)
    db.commit()
    db.refresh(db_comp)
    return db_comp


@router.get("/competencies", response_model=list[CompetencyResponse])
def get_competencies(stack_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Competency)
    if stack_id:
        query = query.filter(Competency.stack_id == stack_id)
    return query.all()