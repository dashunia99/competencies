from datetime import datetime
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
    UserMaterialProgress,
    UserProgress,
    Submission,
)

router = APIRouter(prefix="", tags=["Личный кабинет и задания"])

MAX_ATTEMPTS = 2


# 1. Личный кабинет сотрудника
@router.get("/users/me/overview", summary="Личный кабинет сотрудника")
def get_my_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = {
        "id": current_user.id,
        "fio": current_user.fio,
        "position": current_user.position,
        "stack": current_user.stack.name if current_user.stack else None,
        "grade": current_user.grade.name if current_user.grade else None,
        "start_date": current_user.start_date,
    }

    user_progs = db.query(UserProgram).filter(UserProgram.user_id == current_user.id).all()
    if not user_progs:
        return {"profile": profile, "programs": []}

    programs_res = []
    for up in user_progs:
        prog = db.query(LearningProgram).filter(LearningProgram.id == up.program_id).first()
        if not prog:
            continue

        items = (
            db.query(ProgramItem)
            .filter(ProgramItem.program_id == prog.id)
            .order_by(ProgramItem.position)
            .all()
        )

        elements = []
        for it in items:
            if it.material_id:
                mat = db.query(Material).filter(Material.id == it.material_id).first()
                mat_prog = db.query(UserMaterialProgress).filter(
                    UserMaterialProgress.user_id == current_user.id,
                    UserMaterialProgress.material_id == it.material_id,
                ).first()
                elements.append({
                    "type": "material",
                    "id": it.material_id,
                    "name": mat.name if mat else "Материал",
                    "link": mat.link if mat else None,
                    "is_completed": bool(mat_prog and mat_prog.is_completed),
                    "position": it.position,
                })
            else:
                task = db.query(Task).filter(Task.id == it.task_id).first()
                task_prog = db.query(UserTaskProgress).filter(
                    UserTaskProgress.user_id == current_user.id,
                    UserTaskProgress.task_id == it.task_id,
                ).first()
                elements.append({
                    "type": "task",
                    "id": it.task_id,
                    "name": task.name if task else "Задание",
                    "status": task_prog.status if task_prog else "not_started",
                    "position": it.position,
                })

        programs_res.append({
            "id": prog.id,
            "name": prog.name,
            "description": prog.description,
            "status": up.status,
            "items": elements,
        })

    return {"profile": profile, "programs": programs_res}


# 2. Карточка учебного материала
@router.get("/materials/{material_id}", summary="Карточка учебного материала")
def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Материал не найден")

    mat_prog = db.query(UserMaterialProgress).filter(
        UserMaterialProgress.user_id == current_user.id,
        UserMaterialProgress.material_id == material_id,
    ).first()

    return {
        "id": material.id,
        "name": material.name,
        "link": material.link,
        "competency_id": material.competency_id,
        "is_completed": bool(mat_prog and mat_prog.is_completed),
    }


# 3. Отметить материал как изученный
@router.post("/materials/{material_id}/complete", summary="Отметить материал как изученный")
def complete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Материал не найден")

    prog = db.query(UserMaterialProgress).filter(
        UserMaterialProgress.user_id == current_user.id,
        UserMaterialProgress.material_id == material_id,
    ).first()

    if not prog:
        prog = UserMaterialProgress(
            user_id=current_user.id,
            material_id=material_id,
            is_completed=True,
        )
        db.add(prog)
    else:
        prog.is_completed = True

    db.commit()
    return {"material_id": material_id, "is_completed": True}


# 4. Старт задания
@router.post("/assignments/{task_id}/start", summary="Нажать «Приступить» (статус in_progress)")
def start_assignment(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    user_prog_ids = [
        up.program_id
        for up in db.query(UserProgram).filter(UserProgram.user_id == current_user.id).all()
    ]
    is_in_program = db.query(ProgramItem).filter(
        ProgramItem.program_id.in_(user_prog_ids),
        ProgramItem.task_id == task_id,
    ).first()

    if not is_in_program:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы можете начать только задание из своей назначенной программы",
        )

    progress = db.query(UserTaskProgress).filter(
        UserTaskProgress.user_id == current_user.id,
        UserTaskProgress.task_id == task_id,
    ).first()

    if progress and progress.status in ["in_progress", "on_review", "accepted"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Задание уже начато или выполнено (статус: {progress.status})",
        )

    now = datetime.utcnow()
    if not progress:
        progress = UserTaskProgress(
            user_id=current_user.id,
            task_id=task_id,
            status="in_progress",
            started_at=now,
        )
        db.add(progress)
    else:
        progress.status = "in_progress"
        progress.started_at = now

    db.commit()
    db.refresh(progress)

    return {
        "task_id": task.id,
        "name": task.name,
        "status": progress.status,
        "started_at": progress.started_at,
    }


# 5. Карточка задания со статусом, последней сдачей и остатком попыток
@router.get("/assignments/{task_id}", summary="Карточка задания со статусом текущего сотрудника")
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

    # Ищем последнюю сдачу и считаем попытки
    submissions = (
        db.query(Submission)
        .filter(Submission.user_id == current_user.id, Submission.task_id == task_id)
        .order_by(Submission.attempt_number)
        .all()
    )
    used_attempts = len(submissions)
    last_sub = submissions[-1] if submissions else None

    return {
        "id": task.id,
        "name": task.name,
        "description": task.description,
        "status": progress.status if progress else "not_started",
        "started_at": progress.started_at if progress else None,
        "remaining_attempts": max(0, MAX_ATTEMPTS - used_attempts),
        "last_submission": {
            "attempt_number": last_sub.attempt_number,
            "decision": last_sub.status,
            "comment": last_sub.comment,
            "reviewed_at": last_sub.reviewed_at,
        } if last_sub else None,
    }


# 6. Сводный прогресс сотрудника по компетенциям и уровням
@router.get("/users/{user_id}/progress", summary="Сводный прогресс и уровни компетенций сотрудника")
def get_user_competency_progress(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_user_access(target_user_id=user_id, current_user=current_user)

    progress_rows = db.query(UserProgress).filter(UserProgress.user_id == user_id).all()
    result = []
    for pr in progress_rows:
        comp = db.query(Competency).filter(Competency.id == pr.competency_id).first()
        if comp:
            result.append({
                "competency_id": comp.id,
                "competency_name": comp.name,
                "level": comp.level,
                "status": pr.status,
            })
    return result