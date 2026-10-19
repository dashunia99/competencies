import sys

from sqlalchemy import text
from app.models.base import (
    Base, User, Role, UserRole, Grade, Stack,
    LearningProgram, ProgramItem, ProgramCompetency, Competency, Material, Task, UserProgram
)
from core.database import engine, SessionLocal
from core.security import hash_password

database_name = engine.url.database
if not database_name:
    raise SystemExit("Отказ от сброса: не удалось определить имя базы данных.")
if not sys.stdin.isatty():
    raise SystemExit(
        "Отказ от сброса: скрипт можно запускать только из интерактивного терминала."
    )

print(f"ВНИМАНИЕ: будет полностью удалена схема public базы данных '{database_name}'.")
confirmation = input(f"Для продолжения введите имя базы данных '{database_name}': ")
if confirmation != database_name:
    raise SystemExit("Подтверждение не совпало. Сброс базы данных отменен.")

print("1. Очищаем старые таблицы каскадно и создаем схему заново...")
with engine.begin() as conn:
    # Удаляем всю схему public со всеми зависимостями (CASCADE) и пересоздаем ее
    conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))

# Создаем все актуальные таблицы из base.py
Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("2. Создаем справочники ролей, грейдов и стеков...")
role_admin = Role(name="Администратор")
role_expert = Role(name="Эксперт")
role_employee = Role(name="Сотрудник")
db.add_all([role_admin, role_expert, role_employee])

grade_junior = Grade(name="Junior")
stack_python = Stack(name="Python-backend")
db.add_all([grade_junior, stack_python])
db.commit()

print("3. Создаем программу обучения, темы, материалы и задания...")
program = LearningProgram(
    name="Онбординг Python разработчика",
    description="Базовая программа входа сотрудника в команду"
)
db.add(program)
db.commit()

competency = Competency(
    name="FastAPI и базы данных PostgreSQL",
    description="Умение создавать роутеры и работать с моделями ORM",
    stack_id=stack_python.id,
    level=1
)
db.add(competency)
db.commit()

# Добавляем привязку программы к теме (и в program_items для COMP-25, и в program_competencies)
prog_item = ProgramItem(program_id=program.id, competency_id=competency.id, order_index=1)
prog_comp = ProgramCompetency(program_id=program.id, competency_id=competency.id)

material = Material(
    name="Руководство по авторизации в FastAPI",
    link="https://habr.com/ru/articles/1051800/",
    competency_id=competency.id
)
task = Task(
    name="Реализовать вход по JWT и проверку ролей",
    description="Написать хэндлеры login и me, протестировать роли",
    competency_id=competency.id,
    max_attempts=2
)
db.add_all([prog_item, prog_comp, material, task])
db.commit()

print("4. Создаем 3 демо-пользователей...")
# 1. Администратор
admin = User(
    fio="Алексей Админов",
    email="admin@webant.ru",
    password=hash_password("admin123password"),
    is_active=True
)
db.add(admin)
db.commit()
db.add(UserRole(user_id=admin.id, role_id=role_admin.id))

# 2. Эксперт (Техлид)
expert = User(
    fio="Елена Экспертова",
    email="expert@webant.ru",
    password=hash_password("expert123password"),
    is_active=True
)
db.add(expert)
db.commit()
db.add(UserRole(user_id=expert.id, role_id=role_expert.id))

# 3. Сотрудник (привязываем прямой stack_id и grade_id)
employee = User(
    fio="Иван Сотрудников",
    email="employee@webant.ru",
    password=hash_password("employee123password"),
    grade_id=grade_junior.id,
    stack_id=stack_python.id,  # <-- прямое поле по новой миграции Даши!
    is_active=True
)
db.add(employee)
db.commit()
db.add_all([
    UserRole(user_id=employee.id, role_id=role_employee.id),
    UserProgram(user_id=employee.id, program_id=program.id, status="Назначена")
])
db.commit()
db.close()

print("🎉 УСПЕХ! База идеально пересоздана и наполнена!")