from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from app.models.base import (
    User,
    LearningProgram,
    UserProgram,
    ProgramCompetency,
    Competency,
    Material,
    Task,
    UserTaskProgress,
)
from schemas.learning import (
    ProgramSchema,
    ProgramDetailSchema,
    MaterialSchema,
    AssignmentStatusSchema,
)

router = APIRouter(prefix="", tags=["Обучение и программы"])


#  Личный кабинет сотрудника
@router.get(
    "/users/me/overview",
    summary="[Сотрудник] Мой личный кабинет: стек, программы, темы и материалы",
)
def get_my_overview(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    # 1. Достаем стек и грейд сотрудника
    stack_name = current_user.stacks[0].name if current_user.stacks else None
    grade_name = current_user.grade.name if current_user.grade else None
    role_name = current_user.roles[0].name if current_user.roles else None

    # 2. Находим назначенные программы сотрудника
    user_programs = db.query(UserProgram).filter(UserProgram.user_id == current_user.id).all()

    programs_data = []
    for up in user_programs:
        program = db.query(LearningProgram).filter(LearningProgram.id == up.program_id).first()
        if not program:
            continue

        # Подтягиваем темы программы
        prog_comps = db.query(ProgramCompetency).filter(ProgramCompetency.program_id == program.id).all()
        comp_ids = [pc.competency_id for pc in prog_comps]
        competencies = db.query(Competency).filter(Competency.id.in_(comp_ids)).all()

        topics_list = []
        for comp in competencies:
            materials = db.query(Material).filter(Material.competency_id == comp.id).all()
            tasks = db.query(Task).filter(Task.competency_id == comp.id).all()

            topics_list.append({
                "id": comp.id,
                "name": comp.name,
                "description": comp.description,
                "materials": [
                    {"id": m.id, "name": m.name, "link": m.link} for m in materials
                ],
                "tasks": [
                    {"id": t.id, "name": t.name, "description": t.description} for t in tasks
                ]
            })

        programs_data.append({
            "id": program.id,
            "name": program.name,
            "description": program.description,
            "status": up.status,
            "topics": topics_list
        })

    # Возвращаем сотруднику всю его учебную вселенную в одном ответе:
    return {
        "user_info": {
            "id": current_user.id,
            "fio": current_user.fio,
            "email": current_user.email,
            "role": role_name,
            "stack": stack_name,
            "grade": grade_name
        },
        "assigned_programs": programs_data
    }
# 3. GET /api/v1/users/{user_id}/programs — получение назначенных программ
@router.get(
    "/users/{user_id}/programs",
    response_model=List[ProgramSchema],
    summary="Получение назначенных программ сотрудника",
)
def get_user_programs(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 🔒 ЗАЩИТА ОТ IDOR (только что придуманная Машей!):
    # Сотрудник может смотреть ТОЛЬКО свои программы!
    current_role = current_user.roles[0].name if current_user.roles else None
    if current_role == "Сотрудник" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен: вы не можете просматривать программы других сотрудников!",
        )

    user_programs = db.query(UserProgram).filter(UserProgram.user_id == user_id).all()
    result = []
    for up in user_programs:
        program = db.query(LearningProgram).filter(LearningProgram.id == up.program_id).first()
        if program:
            result.append({
                "id": program.id,
                "name": program.name,
                "description": program.description,
                "status": up.status,
            })
    return result


# 4. GET /api/v1/programs/{id} — получение тем программы, связанных материалов и заданий
@router.get(
    "/programs/{program_id}",
    response_model=ProgramDetailSchema,
    summary="Получение тем программы, связанных материалов и заданий",
)
def get_program_details(
    program_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    program = db.query(LearningProgram).filter(LearningProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Программа не найдена")

    # Ищем привязанные темы (компетенции) к программе
    prog_comps = db.query(ProgramCompetency).filter(ProgramCompetency.program_id == program_id).all()
    comp_ids = [pc.competency_id for pc in prog_comps]

    competencies = db.query(Competency).filter(Competency.id.in_(comp_ids)).all()

    topics_res = []
    for comp in competencies:
        materials = db.query(Material).filter(Material.competency_id == comp.id).all()
        tasks = db.query(Task).filter(Task.competency_id == comp.id).all()
        topics_res.append({
            "id": comp.id,
            "name": comp.name,
            "description": comp.description,
            "materials": materials,
            "tasks": tasks,
        })

    return {
        "id": program.id,
        "name": program.name,
        "description": program.description,
        "topics": topics_res,
    }


# 5. GET /api/v1/materials/{id} — получение материала
@router.get(
    "/materials/{material_id}",
    response_model=MaterialSchema,
    summary="Получение материала",
)
def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Материал не найден")
    return material


# 6. GET /api/v1/assignments/{id} — получение задания и его текущего статуса
@router.get(
    "/assignments/{task_id}",
    response_model=AssignmentStatusSchema,
    summary="Получение задания и его текущего статуса",
)
def get_assignment(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задание не найдено")

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
    }


# 7. POST /api/v1/assignments/{id}/start — нажать «Приступить» (статус «В работе» и фиксация времени)
@router.post(
    "/assignments/{task_id}/start",
    response_model=AssignmentStatusSchema,
    summary="Приступить к выполнению задания",
)
def start_assignment(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задание не найдено")

    progress = db.query(UserTaskProgress).filter(
        UserTaskProgress.user_id == current_user.id,
        UserTaskProgress.task_id == task_id,
    ).first()

    now = datetime.now(timezone.utc)

    if not progress:
        progress = UserTaskProgress(
            user_id=current_user.id,
            task_id=task_id,
            status="В работе",
            started_at=now,
        )
        db.add(progress)
    else:
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
    }
# 8. GET /api/v1/directions — Список всех стеков/направлений
@router.get("/directions", summary="Список направлений и стеков")
def get_directions(db: Session = Depends(get_db)):
    from app.models.base import Stack
    stacks = db.query(Stack).all()
    return [{"id": s.id, "name": s.name} for s in stacks]


# 9. GET /api/v1/directions/{stack_id}/competency-matrix — Матрица компетенций стека
@router.get("/directions/{stack_id}/competency-matrix", summary="Матрица компетенций стека")
def get_competency_matrix(stack_id: int, db: Session = Depends(get_db)):
    competencies = db.query(Competency).filter(Competency.stack_id == stack_id).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "level": c.level,
            "parent_id": c.parent_id
        }
        for c in competencies
    ]