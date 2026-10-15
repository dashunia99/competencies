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