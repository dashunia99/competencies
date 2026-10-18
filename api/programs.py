from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.base import User, LearningProgram, ProgramItem, Competency, UserProgram
from core.database import get_db
from core.security import get_current_user, require_roles
from app.models.base import User, LearningProgram, ProgramItem, Competency
from schemas.programs import (
    ProgramCreateSchema,
    ProgramShortSchema,
    ProgramDetailSchema,
    SetProgramItemsSchema,
    AssignProgramSchema,
    ProgramAssignmentResponseSchema,
)

router = APIRouter(prefix="/programs", tags=["Программы обучения"])


# 1. Список всех программ (доступен всем авторизованным)
@router.get("/", response_model=List[ProgramShortSchema], summary="Список всех программ")
def get_programs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(LearningProgram).all()


# 2. Создать программу (ТОЛЬКО ЭКСПЕРТ)
@router.post(
    "/",
    response_model=ProgramShortSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Создать программу (только Эксперт)",
)
def create_program(
    program_data: ProgramCreateSchema,
    db: Session = Depends(get_db),
    expert_user: User = Depends(require_roles("Эксперт")),
):
    new_program = LearningProgram(
        name=program_data.name,
        description=program_data.description,
    )
    db.add(new_program)
    db.commit()
    db.refresh(new_program)
    return new_program


# 3. Детальная карточка программы с темами
@router.get("/{program_id}", response_model=ProgramDetailSchema, summary="Карточка программы с темами")
def get_program(
    program_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    program = db.query(LearningProgram).filter(LearningProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Программа обучения не найдена")

    # Достаем элементы программы через новую таблицу program_items
    items = (
        db.query(ProgramItem)
        .filter(ProgramItem.program_id == program_id)
        .order_by(ProgramItem.order_index)
        .all()
    )

    items_res = []
    for item in items:
        comp = db.query(Competency).filter(Competency.id == item.competency_id).first()
        items_res.append({
            "id": item.id,
            "competency_id": item.competency_id,
            "competency_name": comp.name if comp else "Неизвестная компетенция",
            "order_index": item.order_index,
        })

    return {
        "id": program.id,
        "name": program.name,
        "description": program.description,
        "items": items_res,
    }


# 4. Редактировать название/описание (ТОЛЬКО ЭКСПЕРТ)
@router.put("/{program_id}", response_model=ProgramShortSchema, summary="Редактировать программу (только Эксперт)")
def update_program(
    program_id: int,
    program_data: ProgramCreateSchema,
    db: Session = Depends(get_db),
    expert_user: User = Depends(require_roles("Эксперт")),
):
    program = db.query(LearningProgram).filter(LearningProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Программа обучения не найдена")

    program.name = program_data.name
    program.description = program_data.description
    db.commit()
    db.refresh(program)
    return program


# 5. Удалить программу (ТОЛЬКО ЭКСПЕРТ)
@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Удалить программу (только Эксперт)")
def delete_program(
    program_id: int,
    db: Session = Depends(get_db),
    expert_user: User = Depends(require_roles("Эксперт")),
):
    program = db.query(LearningProgram).filter(LearningProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Программа обучения не найдена")

    db.delete(program)
    db.commit()
    return None


# 6. Задать состав программы (PUT /programs/{id}/items) — ПОЛНАЯ ЗАМЕНА
@router.put(
    "/{program_id}/items",
    response_model=ProgramDetailSchema,
    summary="Задать состав программы (полная замена, только Эксперт)",
)
def set_program_items(
    program_id: int,
    payload: SetProgramItemsSchema,
    db: Session = Depends(get_db),
    expert_user: User = Depends(require_roles("Эксперт")),
):
    program = db.query(LearningProgram).filter(LearningProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Программа обучения не найдена")

    # 1. По требованию техлида: полностью удаляем СТАРЫЙ состав программы
    db.query(ProgramItem).filter(ProgramItem.program_id == program_id).delete()

    # 2. Вставляем НОВЫЙ состав
    for item_data in payload.items:
        comp = db.query(Competency).filter(Competency.id == item_data.competency_id).first()
        if not comp:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Компетенция с id={item_data.competency_id} не найдена",
            )

        new_item = ProgramItem(
            program_id=program_id,
            competency_id=item_data.competency_id,
            order_index=item_data.order_index,
        )
        db.add(new_item)

    db.commit()

    # Возвращаем обновленную карточку программы
    return get_program(program_id=program_id, db=db, current_user=expert_user)
# ==========================================
# НАЗНАЧЕНИЕ ПРОГРАММЫ (COMP-26)
# ==========================================

@router.post(
    "/{program_id}/assign",
    response_model=ProgramAssignmentResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Назначить программу сотруднику (Админ и Эксперт)",
)
def assign_program_to_user(
    program_id: int,
    payload: AssignProgramSchema,
    db: Session = Depends(get_db),
    # Доступ разрешен ТОЛЬКО Администратору и Эксперту:
    current_user: User = Depends(require_roles("Администратор", "Эксперт")),
):
    # 1. Проверяем существование программы
    program = db.query(LearningProgram).filter(LearningProgram.id == program_id).first()
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Программа обучения не найдена",
        )

    # 2. Проверяем существование пользователя
    target_user = db.query(User).filter(User.id == payload.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    # 3. Проверяем, не назначена ли программа уже
    existing_assignment = db.query(UserProgram).filter(
        UserProgram.user_id == payload.user_id,
        UserProgram.program_id == program_id,
    ).first()

    if existing_assignment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Эта программа уже назначена данному сотруднику",
        )

    # 4. Создаем назначение в БД
    new_assignment = UserProgram(
        user_id=payload.user_id,
        program_id=program_id,
        status="Назначена",
    )
    db.add(new_assignment)
    db.commit()

    return {
        "user_id": target_user.id,
        "program_id": program.id,
        "program_name": program.name,
        "status": new_assignment.status,
    }


@router.delete(
    "/{program_id}/assign/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Снять программу с сотрудника (Админ и Эксперт)",
)
def unassign_program_from_user(
    program_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Администратор", "Эксперт")),
):
    assignment = db.query(UserProgram).filter(
        UserProgram.user_id == user_id,
        UserProgram.program_id == program_id,
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Назначение не найдено",
        )

    db.delete(assignment)
    db.commit()
    return None