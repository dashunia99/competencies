from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user, require_roles
from app.models.base import (
    User,
    Task,
    UserProgram,
    ProgramItem,
    UserTaskProgress,
    Submission,
    UserProgress,
    Material,
    UserMaterialProgress,
)
from schemas.submissions import SubmitAssignmentSchema, ReviewSubmissionSchema

router = APIRouter(prefix="", tags=["Сдача и проверка заданий"])


# ==========================================
# COMP-28: СДАЧА РАБОТЫ СОТРУДНИКОМ
# ==========================================

@router.post("/assignments/{task_id}/submit", summary="Сдать задание на проверку")
def submit_assignment(
    task_id: int,
    payload: SubmitAssignmentSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Проверяем роль: сдавать может только Сотрудник
    roles = [r.name for r in current_user.roles]
    if "Сотрудник" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Сдавать задания могут только сотрудники",
        )

    # 2. Проверяем существование задания и получаем лимит попыток из модели (Замечание 4.1)
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задание не найдено",
        )

    max_attempts = task.max_attempts or 2

    # 3. Проверяем, входит ли задание в назначенную программу сотрудника (Замечание 4.3)
    user_progs = [
        up.program_id
        for up in db.query(UserProgram).filter(UserProgram.user_id == current_user.id).all()
    ]
    in_program = (
        db.query(ProgramItem)
        .filter(ProgramItem.program_id.in_(user_progs), ProgramItem.task_id == task_id)
        .first()
    )
    if not in_program:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Задание не входит в вашу программу обучения",
        )

    # 4. Проверяем статус задания: должно быть in_progress или returned
    progress = db.query(UserTaskProgress).filter(
        UserTaskProgress.user_id == current_user.id,
        UserTaskProgress.task_id == task_id,
    ).first()

    if not progress or progress.status not in ["in_progress", "returned"]:
        current_st = progress.status if progress else "not_started"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Нельзя сдать задание со статусом '{current_st}'. Задание должно быть 'in_progress' или 'returned'",
        )

    # 5. Вычисляем номер попытки безопасным способом (Замечание 4.4)
    current_max_attempt = (
        db.query(func.max(Submission.attempt_number))
        .filter(Submission.user_id == current_user.id, Submission.task_id == task_id)
        .scalar()
        or 0
    )

    if current_max_attempt >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Лимит попыток ({max_attempts}) по данному заданию исчерпан",
        )

    attempt_number = current_max_attempt + 1
    now = datetime.utcnow()

    # 6. Создаем запись сдачи (текст, ссылка или файл)
    submission = Submission(
        user_id=current_user.id,
        task_id=task_id,
        attempt_number=attempt_number,
        status="on_review",
        content=payload.content,
        link=payload.link,
        file_key=payload.file_key,
        created_at=now,
    )
    db.add(submission)

    # 7. Обновляем статус задания
    progress.status = "on_review"
    progress.submitted_at = now

    db.commit()
    db.refresh(submission)

    return {
        "submission_id": submission.id,
        "task_id": task_id,
        "attempt_number": attempt_number,
        "remaining_attempts": max(0, max_attempts - attempt_number),
        "status": "on_review",
        "submitted_at": now,
    }


# ==========================================
# COMP-29: ПРОВЕРКА ЭКСПЕРТОМ / АДМИНОМ (ОЧЕРЕДЬ И РЕШЕНИЕ)
# ==========================================

# 1. Очередь на проверку (доступно Эксперту и Администратору по замечанию 4.6)
@router.get("/expert/submissions", summary="Очередь заданий на проверку (Эксперт и Администратор)")
def get_expert_queue(
    status_filter: str = "on_review",
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_roles("Эксперт", "Администратор")),
):
    submissions = (
        db.query(Submission)
        .filter(Submission.status == status_filter)
        .order_by(Submission.created_at)
        .all()
    )

    result = []
    for s in submissions:
        result.append({
            "id": s.id,
            "employee_fio": s.user.fio if s.user else "Неизвестно",
            "task_name": s.task.name if s.task else "Задание",
            "attempt_number": s.attempt_number,
            "submitted_at": s.created_at,
        })
    return result


# 2. Карточка сдачи с историей попыток
@router.get("/submissions/{submission_id}", summary="Карточка сдачи с историей попыток")
def get_submission_card(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сдача не найдена")

    roles = [r.name for r in current_user.roles]
    is_privileged = any(r in ["Эксперт", "Администратор"] for r in roles)

    # Эксперт и Администратор видят всё, сотрудник — только свою сдачу
    if not is_privileged and sub.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ к чужой сдаче запрещен",
        )

    history = (
        db.query(Submission)
        .filter(Submission.user_id == sub.user_id, Submission.task_id == sub.task_id)
        .order_by(Submission.attempt_number)
        .all()
    )

    return {
        "id": sub.id,
        "status": sub.status,
        "attempt_number": sub.attempt_number,
        "content": sub.content,
        "link": sub.link,
        "file_key": sub.file_key,
        "submitted_at": sub.created_at,
        "task": {
            "id": sub.task.id,
            "name": sub.task.name,
            "description": sub.task.description,
        } if sub.task else None,
        "employee": {
            "id": sub.user.id,
            "fio": sub.user.fio,
            "stack": sub.user.stack.name if sub.user.stack else None,
            "grade": sub.user.grade.name if sub.user.grade else None,
        } if sub.user else None,
        "past_attempts": [
            {
                "attempt": h.attempt_number,
                "status": h.status,
                "comment": h.comment,
                "reviewed_at": h.reviewed_at,
            }
            for h in history
        ],
    }


# 3. Решение по сдаче (лимит попыток из Task + честное закрытие компетенции)
@router.post("/submissions/{submission_id}/review", summary="Решение эксперта/администратора по работе")
def review_submission(
    submission_id: int,
    payload: ReviewSubmissionSchema,
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_roles("Эксперт", "Администратор")),
):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сдача не найдена")

    if sub.status != "on_review":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Сдача уже рассмотрена (текущий статус: {sub.status})",
        )

    # Получаем задание и его лимит попыток
    task = db.query(Task).filter(Task.id == sub.task_id).first()
    max_attempts = task.max_attempts if task and task.max_attempts else 2

    now = datetime.utcnow()

    # 1. Обновляем саму сдачу
    sub.status = payload.decision
    sub.reviewer_id = reviewer.id
    sub.comment = payload.comment
    sub.reviewed_at = now

    # 2. Обновляем статус задания в user_task_progress
    progress = db.query(UserTaskProgress).filter(
        UserTaskProgress.user_id == sub.user_id,
        UserTaskProgress.task_id == sub.task_id,
    ).first()

    if payload.decision == "accepted":
        if progress:
            progress.status = "accepted"
            progress.completed_at = now

        # 🌟 ЧЕСТНАЯ ПРОВЕРКА ЗАКРЫТИЯ КОМПЕТЕНЦИИ (Замечание 4.2)
        if task and task.competency_id:
            comp_id = task.competency_id

            # А. Проверяем, что ВСЕ материалы по этой компетенции изучены
            comp_materials = db.query(Material).filter(Material.competency_id == comp_id).all()
            materials_ok = True
            for m in comp_materials:
                m_prog = db.query(UserMaterialProgress).filter(
                    UserMaterialProgress.user_id == sub.user_id,
                    UserMaterialProgress.material_id == m.id,
                    UserMaterialProgress.is_completed.is_(True),
                ).first()
                if not m_prog:
                    materials_ok = False
                    break

            # Б. Проверяем, что ВСЕ задания по этой компетенции приняты (accepted)
            comp_tasks = db.query(Task).filter(Task.competency_id == comp_id).all()
            tasks_ok = True
            for t in comp_tasks:
                t_prog = db.query(UserTaskProgress).filter(
                    UserTaskProgress.user_id == sub.user_id,
                    UserTaskProgress.task_id == t.id,
                    UserTaskProgress.status == "accepted",
                ).first()
                if not t_prog:
                    tasks_ok = False
                    break

            # Компетенция завершена ТОЛЬКО если выполнены и ВСЕ материалы, и ВСЕ задания
            all_done = materials_ok and tasks_ok

            user_comp_prog = db.query(UserProgress).filter(
                UserProgress.user_id == sub.user_id,
                UserProgress.competency_id == comp_id,
            ).first()

            new_status = "completed" if all_done else "in_progress"
            if not user_comp_prog:
                user_comp_prog = UserProgress(
                    user_id=sub.user_id,
                    competency_id=comp_id,
                    status=new_status,
                )
                db.add(user_comp_prog)
            else:
                user_comp_prog.status = new_status

    else:  # returned
        # Логика попыток на основе task.max_attempts
        if sub.attempt_number < max_attempts:
            if progress:
                progress.status = "returned"
        else:
            if progress:
                progress.status = "needs_help"

    db.commit()

    return {
        "submission_id": sub.id,
        "decision": payload.decision,
        "task_status": progress.status if progress else None,
        "comment": sub.comment,
        "reviewed_at": now,
    }