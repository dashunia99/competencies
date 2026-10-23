from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
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

MAX_ATTEMPTS = 2


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
        raise HTTPException(status_code=403, detail="Сдавать задания могут только сотрудники")

    # 2. Проверяем, входит ли задание в назначенную программу
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
        raise HTTPException(status_code=403, detail="Задание не входит в вашу программу обучения")

    # 3. Проверяем статус задания: должно быть in_progress или returned
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

    # 4. Вычисляем номер попытки
    past_submissions_count = db.query(Submission).filter(
        Submission.user_id == current_user.id,
        Submission.task_id == task_id,
    ).count()

    if past_submissions_count >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Лимит попыток (2) по данному заданию исчерпан",
        )

    attempt_number = past_submissions_count + 1
    now = datetime.utcnow()

    # 5. Создаем запись сдачи (текст, ссылка или файл)
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

    # 6. Обновляем статус задания
    progress.status = "on_review"
    progress.submitted_at = now

    db.commit()
    db.refresh(submission)

    return {
        "submission_id": submission.id,
        "task_id": task_id,
        "attempt_number": attempt_number,
        "remaining_attempts": max(0, MAX_ATTEMPTS - attempt_number),
        "status": "on_review",
        "submitted_at": now,
    }


# ==========================================
# COMP-29: ПРОВЕРКА ЭКСПЕРТОМ (ОЧЕРЕДЬ И РЕШЕНИЕ)
# ==========================================

# 1. Очередь на проверку (старые сначала)
@router.get("/expert/submissions", summary="Очередь заданий на проверку (только Эксперт)")
def get_expert_queue(
    status_filter: str = "on_review",
    db: Session = Depends(get_db),
    expert: User = Depends(require_roles("Эксперт")),
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
        raise HTTPException(status_code=404, detail="Сдача не найдена")

    roles = [r.name for r in current_user.roles]
    is_expert = "Эксперт" in roles

    # Проверка: эксперт может всё, сотрудник — только свою сдачу
    if not is_expert and sub.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Доступ к чужой сдаче запрещен")

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


# 3. Решение эксперта по сдаче (лимит 2 попыток + повышение уровня компетенции)
@router.post("/submissions/{submission_id}/review", summary="Решение эксперта по работе")
def review_submission(
    submission_id: int,
    payload: ReviewSubmissionSchema,
    db: Session = Depends(get_db),
    expert: User = Depends(require_roles("Эксперт")),
):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Сдача не найдена")

    if sub.status != "on_review":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Сдача уже рассмотрена (текущий статус: {sub.status})",
        )

    now = datetime.utcnow()

    # 1. Обновляем сдачу
    sub.status = payload.decision
    sub.reviewer_id = expert.id
    sub.comment = payload.comment
    sub.reviewed_at = now

    # 2. Обновляем статус в user_task_progress
    progress = db.query(UserTaskProgress).filter(
        UserTaskProgress.user_id == sub.user_id,
        UserTaskProgress.task_id == sub.task_id,
    ).first()

    if payload.decision == "accepted":
        if progress:
            progress.status = "accepted"
            progress.completed_at = now

        # 🌟 Автоматическое продвижение уровня компетенции сотрудника
        task_obj = db.query(Task).filter(Task.id == sub.task_id).first()
        if task_obj and task_obj.competency_id:
            comp_id = task_obj.competency_id

            comp_materials = db.query(Material).filter(Material.competency_id == comp_id).all()
            all_materials_done = True
            for m in comp_materials:
                m_prog = db.query(UserMaterialProgress).filter(
                    UserMaterialProgress.user_id == sub.user_id,
                    UserMaterialProgress.material_id == m.id,
                    UserMaterialProgress.is_completed.is_(True),
                ).first()
                if not m_prog:
                    all_materials_done = False
                    break

            user_comp_prog = db.query(UserProgress).filter(
                UserProgress.user_id == sub.user_id,
                UserProgress.competency_id == comp_id,
            ).first()

            new_comp_status = "completed" if all_materials_done else "in_progress"
            if not user_comp_prog:
                user_comp_prog = UserProgress(
                    user_id=sub.user_id,
                    competency_id=comp_id,
                    status=new_comp_status,
                )
                db.add(user_comp_prog)
            else:
                user_comp_prog.status = new_comp_status

    else:  # returned
        if sub.attempt_number < MAX_ATTEMPTS:
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