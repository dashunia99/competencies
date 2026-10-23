from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user, require_roles
from app.models.base import User, LearningProgram, ProgramItem, Material, Task
from schemas.programs import (
    ProgramCreateSchema,
    ProgramUpdateSchema,
    ProgramShortSchema,
    ProgramDetailSchema,
    SetProgramItemsSchema,
    ProgramItemResponseSchema,
)

router = APIRouter(prefix="/programs", tags=["Программы обучения"])


# 1. Список программ (все авторизованные)
@router.get("/", response_model=List[ProgramShortSchema], summary="Список программ")
def get_programs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(LearningProgram).all()


# 2. Создание программы (только эксперт)
@router.post("/", response_model=ProgramShortSchema, status_code=status.HTTP_201_CREATED, summary="Создать программу")
def create_program(
    payload: ProgramCreateSchema,
    db: Session = Depends(get_db),
    expert: User = Depends(require_roles("Эксперт")),
):
    program = LearningProgram(
        name=payload.name,
        description=payload.description,
        creator_id=expert.id,
    )
    db.add(program)
    db.commit()
    db.refresh(program)
    return program


# 3. Детали программы и её элементы по position (все)
@router.get("/{program_id}", response_model=ProgramDetailSchema, summary="Карточка программы с элементами")
def get_program(
    program_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    program = db.query(LearningProgram).filter(LearningProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")

    items = db.query(ProgramItem).filter(ProgramItem.program_id == program_id).order_by(ProgramItem.position.asc()).all()

    items_res = []
    for it in items:
        if it.material_id:
            mat = db.query(Material).filter(Material.id == it.material_id).first()
            name = mat.name if mat else "Неизвестный материал"
            item_type = "material"
            target_id = it.material_id
        else:
            task = db.query(Task).filter(Task.id == it.task_id).first()
            name = task.name if task else "Неизвестное задание"
            item_type = "task"
            target_id = it.task_id

        items_res.append(
            ProgramItemResponseSchema(
                id=it.id,
                type=item_type,
                item_id=target_id,
                name=name,
                position=it.position,
            )
        )

    return {
        "id": program.id,
        "name": program.name,
        "description": program.description,
        "creator_id": program.creator_id,
        "items": items_res,
    }


# 4. Частичное обновление названия и описания (PATCH, только эксперт)
@router.patch("/{program_id}", response_model=ProgramShortSchema, summary="Изменить название и описание")
def update_program(
    program_id: int,
    payload: ProgramUpdateSchema,
    db: Session = Depends(get_db),
    expert: User = Depends(require_roles("Эксперт")),
):
    program = db.query(LearningProgram).filter(LearningProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")

    if payload.name is not None:
        program.name = payload.name
    if payload.description is not None:
        program.description = payload.description

    db.commit()
    db.refresh(program)
    return program


# 5. Задать состав программы (полная замена, только эксперт)
@router.put("/{program_id}/items", response_model=ProgramDetailSchema, summary="Задать состав программы")
def set_program_items(
    program_id: int,
    payload: SetProgramItemsSchema,
    db: Session = Depends(get_db),
    expert: User = Depends(require_roles("Эксперт")),
):
    program = db.query(LearningProgram).filter(LearningProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")

    # Валидация существования всех объектов до удаления старых
    for it in payload.items:
        if it.material_id and not db.query(Material).filter(Material.id == it.material_id).first():
            raise HTTPException(status_code=404, detail=f"Материал с id={it.material_id} не найден")
        if it.task_id and not db.query(Task).filter(Task.id == it.task_id).first():
            raise HTTPException(status_code=404, detail=f"Задание с id={it.task_id} не найдено")

    # 1. Полностью очищаем старый состав
    db.query(ProgramItem).filter(ProgramItem.program_id == program_id).delete()

    # 2. Записываем новый
    for it in payload.items:
        new_item = ProgramItem(
            program_id=program_id,
            material_id=it.material_id,
            task_id=it.task_id,
            position=it.position,
        )
        db.add(new_item)

    db.commit()
    return get_program(program_id=program_id, db=db, current_user=expert)

@router.delete(
    "/{program_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить программу обучения (только Эксперт)",
)
def delete_program(
    program_id: int,
    db: Session = Depends(get_db),
    expert: User = Depends(require_roles("Эксперт")),
):
    prog = db.query(LearningProgram).filter(LearningProgram.id == program_id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Программа не найдена")

    db.delete(prog)
    db.commit()
    return None