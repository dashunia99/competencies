import os
import sys

# Добавляем пути импорта
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database import SessionLocal
from app.models.base import User, Role, Stack, Grade, LearningProgram, Competency, Material, Task

def audit_database():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        roles = db.query(Role).all()
        stacks = db.query(Stack).all()
        grades = db.query(Grade).all()
        programs = db.query(LearningProgram).all()
        competencies_count = db.query(Competency).count()
        materials_count = db.query(Material).count()
        tasks_count = db.query(Task).count()

        print("\n🔍 АУДИТ ТЕКУЩЕЙ БАЗЫ ДАННЫХ:")
        print(f"👤 Пользователей в базе: {len(users)} ({[u.email for u in users]})")
        print(f"🏷️  Ролей в базе: {[r.name for r in roles]}")
        print(f"📚 Стеков (направлений): {[s.name for s in stacks]}")
        print(f"🎓 Грейдов: {[g.name for g in grades]}")
        print(f"📖 Программ обучения: {[p.name for p in programs]}")
        print(f"🧩 Тем (компетенций): {competencies_count} шт.")
        print(f"📄 Материалов: {materials_count} шт.")
        print(f"✏️  Заданий: {tasks_count} шт.\n")
    except Exception as e:
        print(f"❌ Ошибка аудита базы данных: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    audit_database()