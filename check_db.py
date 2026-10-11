from core.database import SessionLocal
from app.models.base import User, Stack, Grade, Role, LearningProgram, Competency, Material, Task

db = SessionLocal()

try:
    print("=" * 40)
    print("🔍 АУДИТ ТЕКУЩЕЙ БАЗЫ ДАННЫХ:")
    print("=" * 40)

    users_count = db.query(User).count()
    stacks = db.query(Stack).all()
    grades = db.query(Grade).all()
    roles = db.query(Role).all()
    programs = db.query(LearningProgram).all()
    competencies = db.query(Competency).all()
    materials = db.query(Material).all()
    tasks = db.query(Task).all()

    print(f"👤 Пользователей в базе: {users_count}")
    print(f"🏷️  Ролей в базе: {[r.name for r in roles]}")
    print(f"📚 Стеков (направлений): {[s.name for s in stacks]}")
    print(f"🎓 Грейдов: {[g.name for g in grades]}")
    print(f"📖 Программ обучения: {[p.name for p in programs]}")
    print(f"🧩 Тем (компетенций): {len(competencies)} шт. ({[c.name for c in competencies[:5]]}...)")
    print(f"📄 Материалов: {len(materials)} шт.")
    print(f"✏️  Заданий: {len(tasks)} шт.")
    print("=" * 40)

finally:
    db.close()