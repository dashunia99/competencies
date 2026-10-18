from app.models.base import (
    Base, User, Role, UserRole, Grade, Stack,
    LearningProgram, ProgramItem, Competency, Material, Task, UserProgram
)
from core.database import engine, SessionLocal
from core.security import hash_password

print("1. Очищаем старые таблицы и создаем заново...")
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("2. Создаем роли, грейд и стек...")
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

# Привязываем тему к программе через новую таблицу ProgramItem (COMP-21 Даши!)
prog_item = ProgramItem(
    program_id=program.id,
    competency_id=competency.id,
    order_index=1
)

# Добавляем учебный материал и задание с лимитом попыток max_attempts=2
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
db.add_all([prog_item, material, task])
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

# 3. Сотрудник (передаем stack_id и grade_id прямо в User!)
employee = User(
    fio="Иван Сотрудников",
    email="employee@webant.ru",
    password=hash_password("employee123password"),
    grade_id=grade_junior.id,
    stack_id=stack_python.id,
    is_active=True
)
db.add(employee)
db.commit()

db.add_all([
    UserRole(user_id=employee.id, role_id=role_employee.id),
    UserProgram(user_id=employee.id, program_id=program.id, status="В процессе")
])
db.commit()
db.close()

print("🎉 УСПЕХ! База наполнена идеальными данными со всеми новыми таблицами!")