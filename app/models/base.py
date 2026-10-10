from sqlalchemy import Column, Integer, String, Text, ForeignKey
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
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)


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


class UserRole(Base):
    __tablename__ = 'user_roles'
    # Составной первичный ключ: обе колонки primary_key=True
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)


class UserStack(Base):
    __tablename__ = 'user_stacks'
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    stack_id = Column(Integer, ForeignKey('stacks.id', ondelete='CASCADE'), primary_key=True)


# ==========================================
# БЛОК 3: БИБЛИОТЕКА КОНТЕНТА (ТЕМЫ)
# ==========================================
class Competency(Base):
    __tablename__ = 'competencies'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    level = Column(Integer)
    # Ссылка на саму себя (иерархия). Если удалить родителя, удалятся и подтемы
    parent_id = Column(Integer, ForeignKey('competencies.id', ondelete='CASCADE'), nullable=True)

    # Это виртуальное поле, оно не создает колонку в БД, но позволяет
    # в коде легко обращаться к дочерним элементам: competency.children
    parent = relationship("Competency", remote_side=[id], backref="children")


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


# ==========================================
# БЛОК 4: ПРОГРАММЫ И ПРОГРЕСС ОБУЧЕНИЯ
# ==========================================
class LearningProgram(Base):
    __tablename__ = 'learning_programs'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)


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
    __tablename__ = 'user_progress'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    competency_id = Column(Integer, ForeignKey('competencies.id', ondelete='CASCADE'))
    status = Column(String)