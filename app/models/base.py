from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, BigInteger, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship

# Создаем базовый класс, от которого наследуются все таблицы.
# Именно его потом будет читать Alembic (Base.metadata)
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
    name = Column(String, unique=True, nullable=False)  # <-- добавляем unique=True


# ==========================================
# БЛОК 2: ПОЛЬЗОВАТЕЛИ И ДОСТУПЫ
# ==========================================
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    fio = Column(String)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    # Если грейд удалят, у юзера останется NULL, сам юзер не удалится
    grade_id = Column(Integer, ForeignKey('grades.id', ondelete='SET NULL'), nullable=True)
    stack_id = Column(Integer, ForeignKey('stacks.id', ondelete='SET NULL'), nullable=True)
    stack = relationship("Stack")


class UserRole(Base):
    __tablename__ = 'user_roles'
    # Составной первичный ключ: обе колонки primary_key=True
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)


# ==========================================
# БЛОК 3: БИБЛИОТЕКА КОНТЕНТА (ТЕМЫ)
# ==========================================
# НОВАЯ ТАБЛИЦА: Разделы (дерево матрицы)
class CompetencyBlock(Base):
    __tablename__ = 'competency_blocks'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    # Ссылка на саму себя для вложенности разделов (дерево)
    parent_id = Column(Integer, ForeignKey('competency_blocks.id', ondelete='CASCADE'), nullable=True)

    # Опционально: relationship для удобной работы в Python
    parent = relationship("CompetencyBlock", remote_side=[id], backref="children")


# ОБНОВЛЕННАЯ ТАБЛИЦА: Компетенции
class Competency(Base):
    __tablename__ = 'competencies'
    id = Column(Integer, primary_key=True)
    stack_id = Column(Integer, ForeignKey('stacks.id', ondelete='CASCADE'), nullable=True)

    # НОВОЕ ПОЛЕ: Привязываем компетенцию к разделу
    block_id = Column(Integer, ForeignKey('competency_blocks.id', ondelete='CASCADE'), nullable=True)

    name = Column(String, nullable=False)
    description = Column(Text)
    level = Column(Integer)
    # дерево строится через competency_blocks!


class Material(Base):
    __tablename__ = 'materials'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    link = Column(String)
    competency_id = Column(Integer, ForeignKey('competencies.id', ondelete='CASCADE'))


class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    competency_id = Column(Integer, ForeignKey('competencies.id', ondelete='CASCADE'))
    max_attempts = Column(Integer, default=2)


# ==========================================
# БЛОК 4: ПРОГРАММЫ И ПРОГРЕСС ОБУЧЕНИЯ
# ==========================================
class LearningProgram(Base):
    __tablename__ = 'learning_programs'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)

class ProgramItem(Base):
    __tablename__ = 'program_items'
    id = Column(Integer, primary_key=True)
    program_id = Column(Integer, ForeignKey('learning_programs.id', ondelete='CASCADE'), nullable=False)
    competency_id = Column(Integer, ForeignKey('competencies.id', ondelete='CASCADE'), nullable=False)
    order_index = Column(Integer, default=0)


class ProgramCompetency(Base):
    __tablename__ = 'program_competencies'
    program_id = Column(Integer, ForeignKey('learning_programs.id', ondelete='CASCADE'), primary_key=True)
    competency_id = Column(Integer, ForeignKey('competencies.id', ondelete='CASCADE'), primary_key=True)


class UserProgram(Base):
    __tablename__ = 'user_programs'
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    program_id = Column(Integer, ForeignKey('learning_programs.id', ondelete='CASCADE'), primary_key=True)
    status = Column(String)


class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    competency_id = Column(Integer, nullable=False)
    status = Column(String, default="Не начато")
    started_at = Column(DateTime, default=datetime.utcnow)

    class Submission(Base):
        __tablename__ = 'submissions'
        id = Column(Integer, primary_key=True)
        user_id = Column(Integer, ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
        task_id = Column(Integer, ForeignKey('tasks.id', ondelete='RESTRICT'), nullable=False)
        attempt_number = Column(Integer, nullable=False, default=1)
        status = Column(String(50), nullable=False, default='pending')  # pending, accepted, rejected
        file_key = Column(String(512))  # ссылка на файл в S3
        comment = Column(Text)  # комментарий пользователя или проверяющего
        created_at = Column(DateTime, default=datetime.utcnow)
        updated_at = Column(DateTime, default=datetime.utcnow,
                            onupdate=datetime.utcnow)  # для отслеживания редактирования
        reviewed_at = Column(DateTime, nullable=True)
        reviewer_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    class File(Base):
        __tablename__ = 'files'
        id = Column(Integer, primary_key=True)
        object_key = Column(String(512), unique=True, nullable=False)  # уникальный ключ в S3
        bucket = Column(String(255), nullable=False)
        original_name = Column(String(512), nullable=False)
        mime_type = Column(String(100), nullable=True)
        size_bytes = Column(BigInteger, nullable=True)
        uploaded_by = Column(Integer, ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
        entity_type = Column(String(50), nullable=False)  # например: 'submission', 'material', 'hr_matrix'
        entity_id = Column(Integer, nullable=True)  # id связанной записи (submission.id или material.id)
        status = Column(String(50), default='uploaded')  # uploaded, deleted
        created_at = Column(DateTime, default=datetime.utcnow)
        deleted_at = Column(DateTime, nullable=True)  # для мягкого удаления (soft delete)

        checksum = Column(String(64))  # Для проверки целостности файла (MD5/SHA256)
        version = Column(Integer, default=1)  # Версия файла (начинается с 1)