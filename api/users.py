from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import (
    hash_password,
    get_current_user,
    require_roles,
    verify_user_access,
)
from app.models.base import (
    User,
    Role,
    UserRole,
    Stack,
    Grade,
    LearningProgram,
    UserProgram,
)
from schemas.users import CreateUserSchema, UserSchema, UpdateUserSchema

router = APIRouter(prefix="/users", tags=["Пользователи"])


class AssignProgramRequest(BaseModel):
    program_id: int


def _check_last_active_admin(user: User, db: Session) -> bool:
    """Проверяет, является ли пользователь последним активным администратором."""
    admin_role = db.query(Role).filter(Role.name == "Администратор").first()
    if not admin_role:
        return False

    is_admin = db.query(UserRole).filter(
        UserRole.user_id == user.id,
        UserRole.role_id == admin_role.id
    ).first()

    if not is_admin:
        return False

    active_admins_count = (
        db.query(User)
        .join(UserRole, User.id == UserRole.user_id)
        .filter(UserRole.role_id == admin_role.id, User.is_active.is_(True))
        .count()
    )
    return active_admins_count <= 1


# ============================================================================
# 1. СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ (Только Администратор)
# ============================================================================
@router.post(
    "/",
    response_model=UserSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Создать пользователя (только Администратор)",
)
def create_user(
    user_data: CreateUserSchema,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("Администратор")),
):
    # Проверка уникальности email
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )

    # Валидация существования стека и грейда (защита от ошибки 500)
    if user_data.stack_id is not None:
        if not db.query(Stack).filter(Stack.id == user_data.stack_id).first():
            raise HTTPException(status_code=404, detail="Указанный стек/направление не найден")

    if user_data.grade_id is not None:
        if not db.query(Grade).filter(Grade.id == user_data.grade_id).first():
            raise HTTPException(status_code=404, detail="Указанный грейд не найден")

    new_user = User(
        fio=user_data.fio,
        email=user_data.email,
        password=hash_password(user_data.password),
        position=user_data.position,
        start_date=user_data.start_date,
        stack_id=user_data.stack_id,
        grade_id=user_data.grade_id,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    assigned_role_name = None
    if user_data.role_name:
        role = db.query(Role).filter(Role.name == user_data.role_name).first()
        if not role:
            role = Role(name=user_data.role_name)
            db.add(role)
            db.commit()
            db.refresh(role)

        db.add(UserRole(user_id=new_user.id, role_id=role.id))
        db.commit()
        assigned_role_name = role.name

    return {
        "id": new_user.id,
        "fio": new_user.fio,
        "email": new_user.email,
        "position": new_user.position,
        "start_date": new_user.start_date,
        "role": assigned_role_name,
        "stack": new_user.stack.name if new_user.stack else None,
        "grade": new_user.grade.name if new_user.grade else None,
        "is_active": new_user.is_active,
    }


# ============================================================================
# 2. СПИСОК ВСЕХ ПОЛЬЗОВАТЕЛЕЙ (Администратор и Эксперт)
# ============================================================================
@router.get(
    "/",
    response_model=List[UserSchema],
    summary="Список всех пользователей (Администратор и Эксперт)",
)
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Администратор", "Эксперт")),
):
    users = db.query(User).all()
    result = []
    for u in users:
        role_name = u.roles[0].name if u.roles else None
        stack_name = u.stack.name if u.stack else None
        grade_name = u.grade.name if u.grade else None
        result.append({
            "id": u.id,
            "fio": u.fio,
            "email": u.email,
            "position": u.position,
            "start_date": u.start_date,
            "role": role_name,
            "stack": stack_name,
            "grade": grade_name,
            "is_active": u.is_active,
        })
    return result


# ============================================================================
# 3. КАРТОЧКА ПОЛЬЗОВАТЕЛЯ ПО ID (Своя или для Администратора/Эксперта)
# ============================================================================
@router.get(
    "/{user_id}",
    response_model=UserSchema,
    summary="Карточка пользователя по ID",
)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_user_access(target_user_id=user_id, current_user=current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    role_name = user.roles[0].name if user.roles else None
    stack_name = user.stack.name if user.stack else None
    grade_name = user.grade.name if user.grade else None

    return {
        "id": user.id,
        "fio": user.fio,
        "email": user.email,
        "position": user.position,
        "start_date": user.start_date,
        "role": role_name,
        "stack": stack_name,
        "grade": grade_name,
        "is_active": user.is_active,
    }


# ============================================================================
# 4. РЕДАКТИРОВАНИЕ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ (Администратор и Эксперт)
# ============================================================================
@router.patch(
    "/{user_id}",
    response_model=UserSchema,
    summary="Изменить профиль пользователя (должность, стек, грейд, роль)",
)
def update_user_profile(
    user_id: int,
    payload: UpdateUserSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Администратор", "Эксперт")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Валидация внешних ключей
    if payload.stack_id is not None:
        if not db.query(Stack).filter(Stack.id == payload.stack_id).first():
            raise HTTPException(status_code=404, detail="Указанный стек/направление не найден")

    if payload.grade_id is not None:
        if not db.query(Grade).filter(Grade.id == payload.grade_id).first():
            raise HTTPException(status_code=404, detail="Указанный грейд не найден")

    if payload.fio is not None:
        user.fio = payload.fio
    if payload.position is not None:
        user.position = payload.position
    if payload.start_date is not None:
        user.start_date = payload.start_date
    if payload.stack_id is not None:
        user.stack_id = payload.stack_id
    if payload.grade_id is not None:
        user.grade_id = payload.grade_id

    # 🛡️ ЗАЩИТА: Менять роль пользователя разрешено ТОЛЬКО Администратору!
    if payload.role_name is not None:
        current_roles = [r.name for r in current_user.roles]
        if "Администратор" not in current_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только администратор имеет право изменять роли пользователей",
            )

        # Защита последнего администратора от понижения в правах
        if payload.role_name != "Администратор" and _check_last_active_admin(user, db):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя снять права с последнего активного администратора",
            )

        role = db.query(Role).filter(Role.name == payload.role_name).first()
        if not role:
            role = Role(name=payload.role_name)
            db.add(role)
            db.commit()
            db.refresh(role)

        # Переназначаем роль
        db.query(UserRole).filter(UserRole.user_id == user.id).delete()
        db.add(UserRole(user_id=user.id, role_id=role.id))

    db.commit()
    db.refresh(user)

    role_name = user.roles[0].name if user.roles else None
    return {
        "id": user.id,
        "fio": user.fio,
        "email": user.email,
        "position": user.position,
        "start_date": user.start_date,
        "role": role_name,
        "stack": user.stack.name if user.stack else None,
        "grade": user.grade.name if user.grade else None,
        "is_active": user.is_active,
    }


# ============================================================================
# 5. БЛОКИРОВКА ПОЛЬЗОВАТЕЛЯ (Только Администратор)
# ============================================================================
@router.post(
    "/{user_id}/block",
    response_model=UserSchema,
    summary="Заблокировать пользователя (только Администратор)",
)
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("Администратор")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Защита от блокировки самого себя
    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Вы не можете заблокировать самого себя",
        )

    # Защита последнего активного администратора
    if _check_last_active_admin(user, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя заблокировать последнего активного администратора системы",
        )

    user.is_active = False
    db.commit()
    db.refresh(user)

    role_name = user.roles[0].name if user.roles else None
    return {
        "id": user.id,
        "fio": user.fio,
        "email": user.email,
        "position": user.position,
        "start_date": user.start_date,
        "role": role_name,
        "stack": user.stack.name if user.stack else None,
        "grade": user.grade.name if user.grade else None,
        "is_active": user.is_active,
    }


# ============================================================================
# 6. ПРОСМОТР НАЗНАЧЕННЫХ ПРОГРАММ СОТРУДНИКА
# ============================================================================
@router.get(
    "/{user_id}/programs",
    summary="Программы сотрудника по его ID",
)
def get_user_programs(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_user_access(target_user_id=user_id, current_user=current_user)

    user_progs = db.query(UserProgram).filter(UserProgram.user_id == user_id).all()
    result = []
    for up in user_progs:
        prog = db.query(LearningProgram).filter(LearningProgram.id == up.program_id).first()
        if prog:
            result.append({
                "id": prog.id,
                "name": prog.name,
                "description": prog.description,
                "status": up.status,
                "assigned_at": up.assigned_at,
            })
    return result


# ============================================================================
# 7. НАЗНАЧЕНИЕ ПРОГРАММЫ СОТРУДНИКУ (Администратор и Эксперт)
# ============================================================================
@router.post(
    "/{user_id}/programs",
    status_code=status.HTTP_201_CREATED,
    summary="Назначить программу сотруднику (COMP-26)",
)
def assign_program_to_user(
    user_id: int,
    payload: AssignProgramRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Администратор", "Эксперт")),
):
    # 1. Проверяем существование пользователя
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # 2. Строгая проверка роли: назначать можно только Сотруднику
    target_roles = [r.name for r in target_user.roles]
    if "Сотрудник" not in target_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Программу обучения можно назначать только пользователям с ролью 'Сотрудник'",
        )

    # 3. Проверяем существование программы
    program = db.query(LearningProgram).filter(LearningProgram.id == payload.program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Программа обучения не найдена")

    # 4. Проверка на дубликат (по ТЗ: 409 Conflict)
    existing = db.query(UserProgram).filter(
        UserProgram.user_id == user_id,
        UserProgram.program_id == payload.program_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Эта программа уже назначена данному сотруднику",
        )

    # 5. Создаем запись о назначении
    assignment = UserProgram(
        user_id=user_id,
        program_id=payload.program_id,
        status="assigned",
        assigned_by=current_user.id,
        assigned_at=datetime.utcnow(),
    )
    db.add(assignment)
    db.commit()

    return {
        "status": "assigned",
        "user_id": user_id,
        "program_id": payload.program_id,
        "assigned_by": current_user.id,
        "assigned_at": assignment.assigned_at,
    }