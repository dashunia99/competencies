-- ==========================================
-- БЛОК 1: СПРАВОЧНИКИ
-- ==========================================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE grades (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE stacks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- ==========================================
-- БЛОК 2: ПОЛЬЗОВАТЕЛИ И ДОСТУПЫ
-- ==========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    fio VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    grade_id INTEGER REFERENCES grades(id) ON DELETE SET NULL,
    stack_id INTEGER REFERENCES stacks(id) ON DELETE SET NULL
);

CREATE TABLE user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY(user_id, role_id)
);

-- ==========================================
-- БЛОК 3: БИБЛИОТЕКА КОНТЕНТА (ТЕМЫ)
-- ==========================================
CREATE TABLE competency_blocks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES competency_blocks(id) ON DELETE CASCADE
);

CREATE TABLE competencies (
    id SERIAL PRIMARY KEY,
    stack_id INTEGER REFERENCES stacks(id) ON DELETE CASCADE,
    block_id INTEGER REFERENCES competency_blocks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    level INTEGER
);

CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    link VARCHAR(255),
    competency_id INTEGER NOT NULL REFERENCES competencies(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    competency_id INTEGER NOT NULL REFERENCES competencies(id) ON DELETE CASCADE
    ALTER TABLE tasks ADD COLUMN max_attempts INTEGER DEFAULT 2;  -- ❌ ЭТО ВНУТРИ CREATE TABLE
);

-- ==========================================
-- БЛОК 4: ПРОГРАММЫ И ПРОГРЕСС ОБУЧЕНИЯ
-- ==========================================
CREATE TABLE learning_programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE program_items (
    id SERIAL PRIMARY KEY,
    program_id INTEGER NOT NULL REFERENCES learning_programs(id) ON DELETE CASCADE,
    competency_id INTEGER NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0
);

CREATE TABLE program_competencies (
    program_id INTEGER NOT NULL REFERENCES learning_programs(id) ON DELETE CASCADE,
    competency_id INTEGER NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    PRIMARY KEY(program_id, competency_id)
);

CREATE TABLE user_programs (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id INTEGER NOT NULL REFERENCES learning_programs(id) ON DELETE CASCADE,
    status VARCHAR(255),
    PRIMARY KEY(user_id, program_id)
);

CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    competency_id INTEGER NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    status VARCHAR(255) DEFAULT 'Не начато',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Таблица попыток отправки заданий
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    file_key VARCHAR(512),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Таблица метаданных файлов для S3
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    object_key VARCHAR(512) NOT NULL UNIQUE,
    bucket VARCHAR(255) NOT NULL,
    original_name VARCHAR(512) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    status VARCHAR(50) DEFAULT 'uploaded',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    checksum VARCHAR(64),       -- ДОБАВЛЕНО ПО ТЗ
    version INTEGER DEFAULT 1   -- ДОБАВЛЕНО ПО ТЗ
);