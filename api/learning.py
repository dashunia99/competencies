from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user, verify_user_access
from app.models.base import (
    User,
    LearningProgram,
    UserProgram,
    ProgramItem,
    Competency,
    Material,
    Task,
    UserTaskProgress,
)
from schemas.learning import (
    CabinetOverviewSchema,
    AssignmentStatusSchema,
    MaterialSchema,
)

router = APIRouter(prefix="", tags=["Личный кабинет и задания (COMP-27)"])


# 1. ЛИЧНЫЙ КАБИНЕТ СОТРУДНИКА (Требование 4: не падает, если программ нет!)
@router.get(
    "/users/me/overview",
    response_model=CabinetOverviewSchema,
    summary="Личный кабинет сотрудника (все программы, темы, задания)",
)
def get_my_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Данные пользователя (безопасно через None, если грейд или стек не назначены)
    role_name = current_user.roles[0].name if current_user.roles else None
    stack_name = current_user.stack.name if current_user.stack else None
    grade_name = current_user.grade.name if current_user.grade else None

    user_info = {
        "id": current_user.id,
        "fio": current_user.fio,
        "email": current_user.email,
        "role": role_name,
        "stack": stack_name,
        "grade": grade_name,
    }

    # 1. Ищем назначенные программы сотрудника
    user_programs = db.query(UserProgram).filter(UserProgram.user_id == current_user.id).all()

    # Если программ нет — сразу возвращаем пустой список, сервер НЕ падает!
    if not user_programs:
        return {
            "user_info": user_info,
            "assigned_programs": [],
        }

    programs_data = []
    for up in user_programs:
        program = db.query(LearningProgram).filter(LearningProgram.id == up.program_id).first()
        if not program:
            continue

        # Подтягиваем темы программы через ProgramItem (COMP-21 Даши!) с сохранением порядка
        prog_items = (
            db.query(ProgramItem)
            .filter(ProgramItem.program_id == program.id)
            .order_by(ProgramItem.order_index)
            .all()
        )
        comp_ids = [pi.competency_id for pi in prog_items]

        competencies = []
        if comp_ids:
            competencies = db.query(Competency).filter(Competency.id.in_(comp_ids)).all()
            # Сортируем темы в порядке order_index из program_items
            comp_map = {c.id: c for c in competencies}
            competencies = [comp_map[cid] for cid in comp_ids if cid in comp_map]

        topics_list = []
        for comp in competencies:
            materials = db.query(Material).filter(Material.competency_id == comp.id).all()
            tasks = db.query(Task).filter(Task.competency_id == comp.id).all()

            topics_list.append({
                "id": comp.id,
                "name": comp.name,
                "description": comp.description,
                "materials": [
                    {
                        "id": m.id,
                        "name": m.name,
                        "link": m.link,
                        "competency_id": m.competency_id,
                    }
                    for m in materials
                ],
                "tasks": [
                    {
                        "id": t.id,
                        "name": t.name,
                        "description": t.description,
                        "competency_id": t.competency_id,
                        "max_attempts": getattr(t, "max_attempts", 2) or 2,
                    }
                    for t in tasks
                ],
            })

        programs_data.append({
            "id": program.id,
            "name": program.name,
            "description": program.description,
            "status": up.status or "Назначена",
            "topics": topics_list,
        })

    return {
        "user_info": user_info,
        "assigned_programs": programs_data,
    }


# 2. ПОЛУЧЕНИЕ КАРТОЧКИ МАТЕРИАЛА
@router.get(
    "/materials/{material_id}",
    response_model=MaterialSchema,
    summary="Карточка учебного материала",
)
def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Материал не найден")
    return mat


# 3. ПОЛУЧЕНИЕ ЗАДАНИЯ И ЕГО ТЕКУЩЕГО СТАТУСА
@router.get(
    "/assignments/{task_id}",
    response_model=AssignmentStatusSchema,
    summary="Карточка задания и его текущий статус",
)
def get_assignment(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    progress = db.query(UserTaskProgress).filter(
        UserTaskProgress.user_id == current_user.id,
        UserTaskProgress.task_id == task_id,
    ).first()

    current_status = progress.status if progress else "Не начато"
    started_at = progress.started_at if progress else None

    return {
        "id": task.id,
        "name": task.name,
        "description": task.description,
        "status": current_status,
        "started_at": started_at,
        "max_attempts": getattr(task, "max_attempts", 2) or 2,
    }


# 4. НАЖАТЬ «ПРИСТУПИТЬ» К ЗАДАНИЮ (Фиксация статуса «В работе» и времени старта)
@router.post(
    "/assignments/{task_id}/start",
    response_model=AssignmentStatusSchema,
    summary="Нажать «Приступить» (статус «В работе» и время старта)",
)
def start_assignment(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    progress = db.query(UserTaskProgress).filter(
        UserTaskProgress.user_id == current_user.id,
        UserTaskProgress.task_id == task_id,
    ).first()

    now = datetime.now(timezone.utc)

    if not progress:
        # Впервые берем в работу: сохраняем статус и текущее время
        progress = UserTaskProgress(
            user_id=current_user.id,
            task_id=task_id,
            status="В работе",
            started_at=now,
        )
        db.add(progress)
    else:
        # Если статус уже был, меняем на "В работе", но НЕ перезаписываем первоначальное время начала!
        progress.status = "В работе"
        if not progress.started_at:
            progress.started_at = now

    db.commit()
    db.refresh(progress)

    return {
        "id": task.id,
        "name": task.name,
        "description": task.description,
        "status": progress.status,
        "started_at": progress.started_at,
        "max_attempts": getattr(task, "max_attempts", 2) or 2,
    }