import os
import pandas as pd
from core.database import SessionLocal
from app.models.base import Stack, Competency, CompetencyBlock


def seed_excel_matrix(file_path: str, stack_title: str):
    if not os.path.exists(file_path):
        print(f"❌ Файл не найден: {file_path}")
        return

    print(f"\n📂 Парсинг иерархической структуры для стека '{stack_title}'...")
    df = pd.read_excel(file_path)
    df = df.iloc[1:].copy()

    df = df.rename(columns={
        df.columns[0]: 'theme',
        df.columns[1]: 'section',
        df.columns[2]: 'competency_text'
    })

    df['theme'] = df['theme'].ffill()
    df['section'] = df['section'].ffill()

    db = SessionLocal()
    try:
        # 1. Находим или создаём стек (Android / Flutter)
        stack_obj = db.query(Stack).filter(Stack.name == stack_title).first()
        if not stack_obj:
            stack_obj = Stack(name=stack_title)
            db.add(stack_obj)
            db.commit()
            db.refresh(stack_obj)
            print(f"✅ Создан стек '{stack_title}' с ID: {stack_obj.id}")
        else:
            print(f"ℹ️ Стек '{stack_title}' найден с ID: {stack_obj.id}")

        stack_id = stack_obj.id

        # 2. Очищаем старые компетенции этого стека перед перезаписью
        db.query(Competency).filter(Competency.stack_id == stack_id).delete()
        db.commit()

        themes_cache = {}
        sections_cache = {}
        count_themes = 0
        count_sections = 0
        count_comps = 0

        for _, row in df.iterrows():
            theme_name = str(row.get('theme', '')).strip()
            section_name = str(row.get('section', '')).strip()
            comp_text = str(row.get('competency_text', '')).strip()

            if not theme_name or theme_name == 'nan':
                continue

            # 3. Уровень 1 в дереве: Тема (родительский CompetencyBlock, parent_id=None)
            if theme_name not in themes_cache:
                theme_block = db.query(CompetencyBlock).filter(
                    CompetencyBlock.name == theme_name,
                    CompetencyBlock.parent_id.is_(None)
                ).first()
                if not theme_block:
                    theme_block = CompetencyBlock(name=theme_name, parent_id=None)
                    db.add(theme_block)
                    db.flush()
                    count_themes += 1
                themes_cache[theme_name] = theme_block

            theme_block_obj = themes_cache[theme_name]

            if not section_name or section_name == 'nan':
                continue

            # 4. Уровень 2 в дереве: Раздел внутри Темы (дочерний CompetencyBlock, parent_id=theme_block_obj.id)
            section_key = (theme_name, section_name)
            if section_key not in sections_cache:
                section_block = db.query(CompetencyBlock).filter(
                    CompetencyBlock.name == section_name,
                    CompetencyBlock.parent_id == theme_block_obj.id
                ).first()
                if not section_block:
                    section_block = CompetencyBlock(name=section_name, parent_id=theme_block_obj.id)
                    db.add(section_block)
                    db.flush()
                    count_sections += 1
                sections_cache[section_key] = section_block

            section_block_obj = sections_cache[section_key]

            # 5. Лист дерева: Конкретная компетенция (привязана к разделу через block_id и к стеку через stack_id)
            if comp_text and comp_text != 'nan':
                comp_item = Competency(
                    stack_id=stack_id,
                    block_id=section_block_obj.id,
                    name=comp_text[:100] + "..." if len(comp_text) > 100 else comp_text,
                    description=comp_text
                )
                db.add(comp_item)
                count_comps += 1

        db.commit()
        print(f"🎉 Дерево для '{stack_title}' успешно загружено:")
        print(f"   - Новых тем (блоков 1-го уровня): {count_themes} (всего в матрице: {len(themes_cache)})")
        print(f"   - Новых разделов (блоков 2-го уровня): {count_sections} (всего в матрице: {len(sections_cache)})")
        print(f"   - Компетенций добавлено: {count_comps}")

    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка при обработке {stack_title}: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_excel_matrix("Android матрица компетенций.xlsx", "Android")
    seed_excel_matrix("Flutter матрица компетенций.xlsx", "Flutter")