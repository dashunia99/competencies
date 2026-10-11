import os
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Stack, Competency
from core.database import SessionLocal
# (или импортируй готовый URL/engine из своего конфига, если он у тебя вынесен)
DATABASE_URL = "postgresql+psycopg2://postgres:1324354657@localhost:5432/webant_skills_db"  # <-- замени на свои данные подключения

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def seed_excel_matrix(file_path: str, stack_title: str):
    if not os.path.exists(file_path):
        print(f" Файл не найден: {file_path}")
        return

    print(f"\n Парсинг иерархической структуры для стека '{stack_title}'...")
    df = pd.read_excel(file_path)

    # Пропускаем строку заголовков Excel и берем чистые данные
    df = df.iloc[1:].copy()

    # Приводим первые три колонки к понятным именам
    df = df.rename(columns={
        df.columns[0]: 'theme',
        df.columns[1]: 'section',
        df.columns[2]: 'competency_text'
    })

    # Заполняем пропуски методом forward fill (так как в Excel темы и разделы объединены)
    df['theme'] = df['theme'].ffill()
    df['section'] = df['section'].ffill()

    db = SessionLocal()
    try:
        # 1. Находим или создаем Стек
        stack_obj = db.query(Stack).filter(Stack.name == stack_title).first()
        if not stack_obj:
            stack_obj = Stack(name=stack_title)
            db.add(stack_obj)
            db.commit()
            db.refresh(stack_obj)
            print(f" Создан стек '{stack_title}' с ID: {stack_obj.id}")
        else:
            print(f" Стек '{stack_title}' найден с ID: {stack_obj.id}")

        stack_id = stack_obj.id

        # 2. Очищаем старые компетенции этого стека перед загрузкой
        db.query(Competency).filter(Competency.stack_id == stack_id).delete()
        db.commit()

        themes_cache = {}  # Кэш для тем: имя_темы -> объект Competency
        sections_cache = {}  # Кэш для разделов: (имя_темы, имя_раздела) -> объект Competency

        count_themes = 0
        count_sections = 0
        count_comps = 0

        for _, row in df.iterrows():
            theme_name = str(row.get('theme', '')).strip()
            section_name = str(row.get('section', '')).strip()
            comp_text = str(row.get('competency_text', '')).strip()

            if not theme_name or theme_name == 'nan':
                continue

            # --- УРОВЕНЬ 1: ТЕМА ---
            if theme_name not in themes_cache:
                theme_comp = Competency(
                    stack_id=stack_id,
                    name=theme_name,
                    description="Тема",
                    level=1,
                    parent_id=None  # Корневой элемент дерева
                )
                db.add(theme_comp)
                db.commit()
                db.refresh(theme_comp)
                themes_cache[theme_name] = theme_comp
                count_themes += 1

            theme_obj = themes_cache[theme_name]

            if not section_name or section_name == 'nan':
                continue

            # --- УРОВЕНЬ 2: РАЗДЕЛ ---
            section_key = (theme_name, section_name)
            if section_key not in sections_cache:
                section_comp = Competency(
                    stack_id=stack_id,
                    name=section_name,
                    description="Раздел",
                    level=2,
                    parent_id=theme_obj.id  # Родитель — Тема
                )
                db.add(section_comp)
                db.commit()
                db.refresh(section_comp)
                sections_cache[section_key] = section_comp
                count_sections += 1

            section_obj = sections_cache[section_key]

            # --- УРОВЕНЬ 3: САМА КОМПЕТЕНЦИЯ (ТЕКСТ) ---
            if comp_text and comp_text != 'nan':
                comp_item = Competency(
                    stack_id=stack_id,
                    name=comp_text[:100] + "..." if len(comp_text) > 100 else comp_text,  # Короткое имя для отображения
                    description=comp_text,  # Полный текст формулировки навыка
                    level=3,
                    parent_id=section_obj.id  # Родитель — Раздел
                )
                db.add(comp_item)
                count_comps += 1

        db.commit()
        print(f" Дерево для '{stack_title}' успешно загружено:")
        print(f"   - Тем: {count_themes}")
        print(f"   - Разделов: {count_sections}")
        print(f"   - Компетенций: {count_comps}")

    except Exception as e:
        db.rollback()
        print(f"Ошибка при обработке {stack_title}: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_excel_matrix("Android матрица компетенций.xlsx", "Android")
    seed_excel_matrix("Flutter матрица компетенций.xlsx", "Flutter")