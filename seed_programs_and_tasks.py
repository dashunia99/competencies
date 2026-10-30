import sys
import os

# Гарантируем видимость модулей проекта
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database import SessionLocal
from app.models.base import (
    Stack,
    CompetencyBlock,
    Competency,
    LearningProgram,
    ProgramItem,
    Task,
    Material,
    User
)

def seed_programs_and_tasks():
    db = SessionLocal()
    try:
        print("🌱 Запуск наполнения учебных программ, материалов и заданий из БД...")

        # 1. Получаем администратора для поля creator_id
        admin = db.query(User).filter_by(email="admin@webant.ru").first()
        admin_id = admin.id if admin else None

        # 2. Получаем направления (Android и Flutter)
        stacks = db.query(Stack).all()
        if not stacks:
            print("❌ Стеки (направления) не найдены в БД!")
            return

        for stack in stacks:
            print(f"\n📦 Обработка направления: {stack.name}")

            # Ищем или создаем программу обучения
            prog_name = f"Онбординг {stack.name} разработчика"
            program = db.query(LearningProgram).filter(
                (LearningProgram.name == prog_name)
            ).first()

            if not program:
                program = LearningProgram(
                    name=prog_name,
                    description=f"Базовая программа стажировки и подготовки к грейду Junior ({stack.name})",
                    creator_id=admin_id
                )
                db.add(program)
                db.commit()
                db.refresh(program)
                print(f"  + Создана программа: {program.name} (id={program.id})")
            else:
                print(f"  ✓ Программа уже существует: {program.name} (id={program.id})")

            # Находим разделы матрицы (competency_blocks) для этого стека
            # Если в competency_blocks есть колонка stack_id или связь:
            blocks = []
            if hasattr(CompetencyBlock, 'stack_id'):
                blocks = db.query(CompetencyBlock).filter_by(stack_id=stack.id).order_by(CompetencyBlock.id).all()
            if not blocks:
                blocks = db.query(CompetencyBlock).order_by(CompetencyBlock.id).limit(4).all()

            # Документация под стек
            official_url = "https://flutter.dev/docs" if stack.name.lower() == "flutter" else "https://developer.android.com/guide"

            pos_idx = 1
            for block in blocks[:3]:
                # Ищем компетенции этого блока
                competencies = db.query(Competency).filter_by(block_id=block.id).order_by(Competency.id).all()
                if not competencies:
                    competencies = db.query(Competency).filter_by(stack_id=stack.id).order_by(Competency.id).limit(3).all()

                for comp in competencies[:2]:
                    # 1. Материал к компетенции
                    mat = db.query(Material).filter_by(competency_id=comp.id).first()
                    if not mat:
                        mat = Material(
                            competency_id=comp.id,
                            name=f"Официальное руководство: {comp.name[:60]}",
                            link=official_url
                        )
                        db.add(mat)
                        db.commit()
                        db.refresh(mat)

                    # 2. Практическое задание к компетенции
                    task = db.query(Task).filter_by(competency_id=comp.id).first()
                    if not task:
                        task = Task(
                            competency_id=comp.id,
                            name=f"Практика: {comp.name[:60]}",
                            description=f"Реализовать модульное решение, подтверждающее навык «{comp.name}». Код оформить в виде Pull Request.",
                            max_attempts=2
                        )
                        db.add(task)
                        db.commit()
                        db.refresh(task)

                    # 3. Привязка к программе через program_items
                    # Проверяем, есть ли уже этот пункт
                    pi = db.query(ProgramItem).filter_by(program_id=program.id, task_id=task.id).first()
                    if not pi:
                        pi = ProgramItem(
                            program_id=program.id,
                            material_id=mat.id,
                            task_id=task.id,
                            position=pos_idx
                        )
                        db.add(pi)
                        db.commit()
                        pos_idx += 1

            print(f"  ✓ Добавлены пункты программы, материалы и практические задания для {stack.name}")

        print("\n✅ База данных успешно наполнена реальными программами и заданиями!")
    except Exception as e:
        db.rollback()
        print(f"\n❌ Ошибка при наполнении БД: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_programs_and_tasks()