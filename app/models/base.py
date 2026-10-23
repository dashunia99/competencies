from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    Boolean,
    DateTime,
    BigInteger,
    Date,
)
from sqlalchemy.orm import declarative_base, relationship, synonym

Base = declarative_base()


# ==========================================
# БЛОК 1: СПРАВОЧНИКИ
# ==========================================
class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)


class Grade(Base):
    __tablename__ = 'grades'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)


class Stack(Base):
    __tablename__ = 'stacks'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


# ==========================================
# БЛОК 2: ПОЛЬЗОВАТЕЛИ И ДОСТУПЫ
# ==========================================
class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    fio = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    password = synonym("password_hash")
    is_active = Column(Boolean, default=True)

    # Поля COMP-17:
    position = Column(String, nullable=True)    # Должность
    start_date = Column(Date, nullable=True)     # Дата начала работы

    grade_id = Column(Integer, ForeignKey('grades.id', ondelete='SET NULL'), nullable=True)
    stack_id = Column(Integer, ForeignKey('stacks.id', ondelete='SET NULL'), nullable=True)

    # Связи
    grade = relationship("Grade")
    stack = relationship("Stack")
    roles = relationship("Role", secondary="user_roles")


class UserRole(Base):
    __tablename__ = 'user_roles'

    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)


# ==========================================
# БЛОК 3: БИБЛИОТЕКА КОНТЕНТА
# ==========================================
class CompetencyBlock(Base):
    __tablename__ = 'competency_blocks'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey('competency_blocks.id', ondelete='CASCADE'), nullable=True)

    parent = relationship("CompetencyBlock", remote_side=[id], backref="children")


class Competency(Base):
    __tablename__ = 'competencies'

    id = Column(Integer, primary_key=True)
    stack_id = Column(Integer, ForeignKey('stacks.id', ondelete='CASCADE'), nullable=True)
    block_id = Column(Integer, ForeignKey('competency_blocks.id', ondelete='CASCADE'), nullable=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    level = Column(Integer, nullable=True)


class Material(Base):
    __tablename__ = 'materials'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    link = Column(String, nullable=True)
    competency_id = Column(Integer, ForeignKey('competencies.id', ondelete='CASCADE'), nullable=True)


class Task(Base):
    __tablename__ = 'tasks'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    competency_id = Column(Integer, ForeignKey('competencies.id', ondelete='CASCADE'), nullable=True)
    max_attempts = Column(Integer, default=2)


# ==========================================
# БЛОК 4: ПРОГРАММЫ И ПРОГРЕСС ОБУЧЕНИЯ
# ==========================================
class LearningProgram(Base):
    __tablename__ = 'learning_programs'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    creator_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    creator = relationship("User", foreign_keys=[creator_id])
    items = relationship("ProgramItem", back_populates="program", cascade="all, delete-orphan")


class ProgramItem(Base):
    """
    Элемент состава программы обучения (COMP-25).
    По ТЗ ссылается либо на material_id, либо на task_id.
    """
    __tablename__ = 'program_items'

    id = Column(Integer, primary_key=True)
    program_id = Column(Integer, ForeignKey('learning_programs.id', ondelete='CASCADE'), nullable=False)
    material_id = Column(Integer, ForeignKey('materials.id', ondelete='CASCADE'), nullable=True)
    task_id = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True)
    position = Column(Integer, default=0)

    program = relationship("LearningProgram", back_populates="items")
    material = relationship("Material")
    task = relationship("Task")


class ProgramCompetency(Base):
    __tablename__ = 'program_competencies'

    program_id = Column(Integer, ForeignKey('learning_programs.id', ondelete='CASCADE'), primary_key=True)
    competency_id = Column(Integer, ForeignKey('competencies.id', ondelete='CASCADE'), primary_key=True)


class UserProgram(Base):
    """
    Назначение программы сотруднику (COMP-26).
    """
    __tablename__ = 'user_programs'

    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    program_id = Column(Integer, ForeignKey('learning_programs.id', ondelete='CASCADE'), primary_key=True)
    status = Column(String(50), default="assigned")
    assigned_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    program = relationship("LearningProgram")
    user = relationship("User", foreign_keys=[user_id])
    assigner = relationship("User", foreign_keys=[assigned_by])


class UserMaterialProgress(Base):
    """
    Отметка об изучении материала (COMP-27).
    """
    __tablename__ = 'user_material_progress'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    material_id = Column(Integer, ForeignKey('materials.id', ondelete='CASCADE'), nullable=False)
    is_completed = Column(Boolean, default=True)


class UserProgress(Base):
    __tablename__ = 'user_progress'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    competency_id = Column(Integer, ForeignKey('competencies.id', ondelete='CASCADE'), nullable=False)
    status = Column(String, default="Не начато")
    started_at = Column(DateTime, default=datetime.utcnow)


class UserTaskProgress(Base):
    """
    Статус выполнения конкретного задания сотрудником (COMP-27, 28, 29).
    """
    __tablename__ = 'user_task_progress'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    task_id = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    status = Column(String(50), default="not_started")  # not_started, in_progress, on_review, accepted, returned, needs_help
    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    task = relationship("Task")
    user = relationship("User")


# ==========================================
# БЛОК 5: СДАЧИ ЗАДАНИЙ И ФАЙЛЫ (COMP-28, 29, S3)
# ==========================================
class Submission(Base):
    """
    Попытка сдачи задания (COMP-28, COMP-29).
    """
    __tablename__ = 'submissions'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    task_id = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    attempt_number = Column(Integer, nullable=False, default=1)
    status = Column(String(50), nullable=False, default='on_review')  # on_review, accepted, returned

    content = Column(Text, nullable=True)              # Текст решения
    link = Column(String(512), nullable=True)          # Ссылка на решение (PR / сайт)
    file_key = Column(String(512), nullable=True)      # Ключ файла в S3
    comment = Column(Text, nullable=True)              # Рецензия эксперта

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    task = relationship("Task", foreign_keys=[task_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])


class File(Base):
    """
    Метаданные файлов в S3/MinIO.
    """
    __tablename__ = 'files'

    id = Column(Integer, primary_key=True)
    object_key = Column(String(512), unique=True, nullable=False)
    bucket = Column(String(255), nullable=False)
    original_name = Column(String(512), nullable=False)
    mime_type = Column(String(100), nullable=True)
    size_bytes = Column(BigInteger, nullable=True)
    uploaded_by = Column(Integer, ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    entity_type = Column(String(50), nullable=False)  # submission, material, hr_matrix
    entity_id = Column(Integer, nullable=True)
    status = Column(String(50), default='uploaded')    # uploaded, deleted
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    checksum = Column(String(64), nullable=True)
    version = Column(Integer, default=1)

