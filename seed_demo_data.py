from datetime import date
from app.models.base import (
    Base, User, Role, UserRole, Grade, Stack,
    LearningProgram, CompetencyBlock, Competency, Material, Task
)
from core.database import engine, SessionLocal
from core.security import hash_password

print("1. Пересоздаем таблицы со всеми новыми полями...")
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("2. Создаем роли, грейды и направления...")
role_admin = Role(name="Администратор")
role_expert = Role(name="Эксперт")
role_employee = Role(name="Сотрудник")
grade_junior = Grade(name="Junior")
grade_middle = Grade(name="Middle")
stack_python = Stack(name="Python-backend")
db.add_all([role_admin, role_expert, role_employee, grade_junior, grade_middle, stack_python])
db.commit()

print("3. Создаем дерево компетенций, материалы и задания...")
theme = CompetencyBlock(name="Архитектура кода", parent_id=None)
db.add(theme)
db.commit()

section = CompetencyBlock(name="SOLID и ООП", parent_id=theme.id)
db.add(section)
db.commit()

comp = Competency(
    name="Применяет принципы SOLID и разделяет слои в FastAPI",
    description="Уровень Junior",
    stack_id=stack_python.id,
    block_id=section.id,
    level=1,
)
db.add(comp)
db.commit()

material = Material(
    name="Гайд по чистой архитектуре в FastAPI",
    link="https://habr.com/ru/articles/1051800/",
    competency_id=comp.id,
)
task = Task(
    name="Реализовать защищенный CRUD с ролями",
    description="Написать эндпоинты и применить проверки ролей",
    competency_id=comp.id,
)
program = LearningProgram(
    name="Онбординг Python-разработчика",
    description="Базовая программа для выхода на проект",
)
db.add_all([material, task, program])
db.commit()

print("4. Создаем 3 пользователей (ID: 1=Админ, 2=Эксперт, 3=Сотрудник)...")
admin = User(fio="Алексей Админов", email="admin@webant.ru", password=hash_password("admin123password"), is_active=True)
expert = User(fio="Елена Экспертова", email="expert@webant.ru", password=hash_password("expert123password"), is_active=True)
employee = User(
    fio="Иван Сотрудников",
    email="employee@webant.ru",
    password=hash_password("employee123password"),
    position="Младший бэкенд-разработчик",
    start_date=date(2026, 10, 1),
    stack_id=stack_python.id,
    grade_id=grade_junior.id,
    is_active=True,
)
db.add_all([admin, expert, employee])
db.commit()

db.add_all([
    UserRole(user_id=admin.id, role_id=role_admin.id),
    UserRole(user_id=expert.id, role_id=role_expert.id),
    UserRole(user_id=employee.id, role_id=role_employee.id),
])
db.commit()
db.close()
print("🎉 Готово! Можно открывать Swagger!")