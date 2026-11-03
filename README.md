# Система управления компетенциями

Веб-приложение для управления сотрудниками, компетенциями, программами обучения, заданиями и проверкой работ.

- Backend: FastAPI, SQLAlchemy, Alembic и PostgreSQL.
- Frontend: React и Vite.
- Файлы: S3-совместимое хранилище (MinIO локально, Railway Bucket в production).
- Авторизация: JWT и роли «Сотрудник», «Эксперт», «Администратор».

Production Docker-образ собирает React и раздаёт его через FastAPI. После запуска интерфейс и API доступны на одном origin:

```text
http://localhost:8000/         → React
http://localhost:8000/api/v1/  → API
http://localhost:8000/docs     → Swagger
```

## Быстрый локальный запуск

### Требования

- Git;
- Docker Desktop с Docker Compose;
- свободные порты `5432`, `8000`, `9000` и `9001`.

Python и Node.js отдельно устанавливать не нужно: сборка выполняется в Docker.

### 1. Получить проект

```powershell
git clone <repository-url>
cd competencies
```

### 2. Создать локальные переменные

```powershell
Copy-Item .env.example .env
```

Перед запуском замените в `.env` как минимум:

```env
POSTGRES_PASSWORD=<пароль локальной PostgreSQL>
DATABASE_URL=postgresql+psycopg://app:<тот-же-пароль>@postgres:5432/webant_skills

JWT_SECRET_KEY=<случайная строка длиной не менее 32 символов>
INITIAL_ADMIN_EMAIL=<email администратора>
INITIAL_ADMIN_PASSWORD=<пароль администратора длиной не менее 12 символов>

MINIO_ROOT_PASSWORD=<пароль локального MinIO>
AWS_SECRET_ACCESS_KEY=<тот-же-пароль MinIO>
```

Сгенерировать JWT-секрет:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

`MINIO_ROOT_PASSWORD` и `AWS_SECRET_ACCESS_KEY` должны совпадать. `.env` исключён из Git и Docker build context.

### 3. Собрать и запустить

```powershell
docker compose up --build -d
docker compose ps
```

При запуске Compose:

1. поднимает PostgreSQL и MinIO;
2. создаёт S3 bucket;
3. выполняет `alembic upgrade head`;
4. запускает FastAPI и собранный React;
5. создаёт первого администратора, если администратора ещё нет.

### 4. Проверить

- интерфейс: <http://localhost:8000/>;
- healthcheck: <http://localhost:8000/api/v1/health>;
- Swagger: <http://localhost:8000/docs>;
- MinIO Console: <http://localhost:9001>.

Проверка из PowerShell:

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/health
docker compose logs --tail 100 api
```

Ожидаемый healthcheck:

```json
{"status":"ok","database":"connected"}
```

Для входа используйте `INITIAL_ADMIN_EMAIL` и `INITIAL_ADMIN_PASSWORD`, указанные при первом запуске. После создания администратора изменение этих переменных не меняет пароль существующей учётной записи.

## Локальные сервисы

| Сервис | Назначение | Адрес |
|---|---|---|
| `api` | React, FastAPI и Alembic | `http://localhost:8000` |
| `postgres` | PostgreSQL 16 | `127.0.0.1:5432` |
| `minio` | S3 API | `http://localhost:9000` |
| `minio` | Web Console | `http://localhost:9001` |
| `minio-init` | Однократное создание bucket | публичного порта нет |

PostgreSQL и MinIO используют Docker volumes. Команда `docker compose down` сохраняет данные.

## Управление окружением

```powershell
# Запустить ранее собранные контейнеры
docker compose up -d

# Пересобрать приложение после изменения кода
docker compose up --build -d api

# Посмотреть логи
docker compose logs -f api

# Остановить контейнеры, сохранив данные
docker compose down
```

Полное удаление локальных данных:

```powershell
docker compose down -v
```

`-v` удаляет PostgreSQL и файлы MinIO без возможности восстановления. Перед этим создайте backup.

## Миграции базы данных

Схема управляется Alembic. При обычном запуске Compose миграции применяются автоматически.

```powershell
# Текущая ревизия
docker compose exec api alembic current

# Применить миграции вручную
docker compose exec api alembic upgrade head

# Проверить единственный актуальный head
docker compose exec api alembic heads
```

Файлы из `docs/legacy-db/` сохранены только как история и не должны применяться к актуальной БД.

## Данные для разработки

Создать тестовые учётные записи сотрудника и эксперта:

```powershell
docker compose exec api python scripts/seed_test_accounts.py
```

Импортировать Android- и Flutter-матрицы из `data/competency_matrices/`:

```powershell
docker compose exec api python scripts/db/seed_matrix.py
```

Повторный импорт матриц заменяет компетенции соответствующих стеков. Остальные скрипты описаны в `scripts/db/README.md`; `seed_demo_data.py` полностью пересоздаёт таблицы и допустим только для одноразовой локальной БД.

## Backup и восстановление

Создать ZIP с PostgreSQL и объектами MinIO:

```powershell
.\scripts\backup.ps1
```

Архив появится в `backups/`.

Восстановить архив:

```powershell
.\scripts\restore.ps1 -BackupPath "C:\path\to\competencies-backup.zip"
```

Восстановление заменяет содержимое локальной PostgreSQL и загружает объекты в MinIO.

## Проверки перед коммитом

```powershell
# Python и интеграционные тесты backend
.\.venv\Scripts\python.exe -m pip install --requirement requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m compileall -q app api migrations scripts main.py
.\.venv\Scripts\python.exe -m alembic heads

# Frontend
Set-Location frontend
npm install
npm run lint
npm run build
Set-Location ..

# Docker Compose
docker compose config --quiet
```

Локальная `.venv` нужна только для разработки без контейнера. Для обычного Docker-запуска она не требуется.

## Структура

```text
api/                         FastAPI-маршруты
app/core/                    конфигурация, БД, JWT и S3
app/models/                  SQLAlchemy-модели
app/schemas/                 Pydantic-схемы API
app/services/                сервисный слой
data/competency_matrices/    исходные Excel-матрицы
docs/                        deployment и production-документация
frontend/                    React-приложение
migrations/                  Alembic-миграции
scripts/                     backup, restore и служебные команды
main.py                      точка входа FastAPI
```

## Railway

Production-развёртывание описано в [docs/deployment/railway.md](docs/deployment/railway.md).

## Частые проблемы

### API не запускается

```powershell
docker compose ps
docker compose logs postgres
docker compose logs minio-init
docker compose logs api
```

Проверьте наличие всех обязательных переменных из `.env.example` и совпадение паролей в связанных настройках.

### Изменили реквизиты PostgreSQL после первого запуска

PostgreSQL volume продолжает использовать реквизиты, с которыми был создан. Верните старые значения либо сначала создайте backup, затем пересоздайте volumes.

### Порт занят

```powershell
Get-NetTCPConnection -State Listen | Where-Object LocalPort -In 5432,8000,9000,9001
```

Остановите конфликтующий процесс или измените левую часть соответствующего `ports` в `docker-compose.yml`.
