# Развёртывание в Railway

Приложение разворачивается одним Docker-сервисом: контейнер собирает React, запускает FastAPI и раздаёт интерфейс и API на одном домене.

Для production нужны три ресурса Railway:

1. PostgreSQL;
2. Bucket;
3. сервис приложения из GitHub-репозитория.

## 1. Создать PostgreSQL

В проекте Railway выберите **Create → Database → PostgreSQL**.

В сервисе приложения создайте reference variable:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

`Postgres` — имя PostgreSQL-сервиса. Если вы его переименовали, используйте новое имя внутри `${{...}}`.

Не создавайте таблицы вручную и не применяйте файлы из `docs/legacy-db/`. Схему создаёт Alembic.

## 2. Создать Bucket

Выберите **Create → Bucket**. Отдельный MinIO-сервис в Railway не нужен.

Добавьте в сервис приложения reference variables:

```env
S3_ENDPOINT_URL=${{Bucket.ENDPOINT}}
S3_PUBLIC_ENDPOINT_URL=${{Bucket.ENDPOINT}}
AWS_ACCESS_KEY_ID=${{Bucket.ACCESS_KEY_ID}}
AWS_SECRET_ACCESS_KEY=${{Bucket.SECRET_ACCESS_KEY}}
AWS_DEFAULT_REGION=${{Bucket.REGION}}
S3_BUCKET_NAME=${{Bucket.BUCKET}}
S3_ADDRESSING_STYLE=virtual
S3_PRESIGNED_TTL=900
```

`Bucket` — имя bucket-ресурса. Если Railway показывает для конкретного bucket path-style URL, используйте `S3_ADDRESSING_STYLE=path`; для текущих Railway Buckets обычно нужен `virtual`.

Bucket можно оставить приватным: приложение выдаёт временные presigned URL.

## 3. Подключить репозиторий

1. Выберите **Create → GitHub Repo**.
2. Подключите нужный репозиторий и production-ветку.
3. Убедитесь, что Railway использует корневой `Dockerfile`.

Root Directory оставьте пустым. Start Command задавать не нужно: команда запуска уже находится в `Dockerfile` и использует Railway-переменную `PORT`.

Dockerfile выполняет двухэтапную сборку:

1. `npm ci` и `npm run build` создают React bundle;
2. Python-образ устанавливает backend и запускает Uvicorn.

## 4. Задать переменные приложения

Кроме PostgreSQL и Bucket добавьте:

```env
JWT_SECRET_KEY=<случайная строка длиной не менее 32 символов>
INITIAL_ADMIN_EMAIL=<email первого администратора>
INITIAL_ADMIN_PASSWORD=<уникальный пароль длиной не менее 12 символов>
CORS_ALLOWED_ORIGINS=
```

Сгенерировать JWT-секрет локально:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Frontend обслуживается тем же доменом, поэтому для штатного развёртывания `CORS_ALLOWED_ORIGINS` можно оставить пустым. Не загружайте `.env` в Git и не копируйте локальные MinIO/PostgreSQL пароли в Railway.

Администратор создаётся при первом успешном запуске, если в БД ещё нет пользователя с ролью администратора. Последующее изменение `INITIAL_ADMIN_PASSWORD` не меняет пароль существующей учётной записи.

Итоговый список обязательных переменных сервиса:

```text
DATABASE_URL
JWT_SECRET_KEY
INITIAL_ADMIN_EMAIL
INITIAL_ADMIN_PASSWORD
S3_ENDPOINT_URL
S3_PUBLIC_ENDPOINT_URL
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION
S3_BUCKET_NAME
S3_ADDRESSING_STYLE
S3_PRESIGNED_TTL
```

## 5. Настроить deploy

В **Settings → Deploy** задайте:

```text
Pre-deploy Command: alembic upgrade head
Healthcheck Path:   /api/v1/health
```

Рекомендуемые настройки:

- Restart Policy: `On Failure`;
- Replicas: `1` до исправления конкурентного bootstrap администратора;
- регион приложения, PostgreSQL и Bucket: одинаковый или ближайший доступный.

Pre-deploy должен выполняться до старта новой версии. Если `alembic upgrade head` завершился ошибкой, не обходите его командой `alembic stamp`: сначала устраните причину или восстановите backup.

## 6. Создать домен

В **Settings → Networking** создайте публичный домен или подключите свой.

На одном домене будут доступны:

```text
https://<домен>/              → React
https://<домен>/api/v1/       → FastAPI
https://<домен>/docs          → Swagger
https://<домен>/api/v1/health → healthcheck
```

PostgreSQL не требует Public Networking: приложение использует Railway reference variable и private network. Public access к БД включайте только временно для администрирования.

## 7. Первый deploy

В логах должны последовательно завершиться:

1. Docker build frontend и backend;
2. pre-deploy `alembic upgrade head`;
3. запуск Uvicorn;
4. bootstrap первого администратора;
5. healthcheck.

Проверьте:

- `https://<домен>/api/v1/health` возвращает `status: ok` и `database: connected`;
- открывается `https://<домен>/`;
- открывается `https://<домен>/docs`;
- вход выполняется с `INITIAL_ADMIN_EMAIL` и первоначальным `INITIAL_ADMIN_PASSWORD`;
- загрузка файла и получение presigned URL работают через Bucket.

## Обновления

При push в подключённую production-ветку Railway должен автоматически создать новый deployment. Перед merge проверяйте:

```powershell
.\.venv\Scripts\python.exe -m alembic heads
Set-Location frontend
npm run lint
npm run build
```

У Alembic должен быть один head. Любое изменение моделей БД, требующее изменения таблиц, должно сопровождаться новой миграцией.

## Перенос существующей БД

Перед применением миграций к непустой БД создайте Railway backup. Не переносите локальные SQL-файлы напрямую в production.

Миграция `d9e8c7b6a5f4` намеренно останавливается, если старая таблица `program_items` содержит `competency_id`: такую связь сначала необходимо преобразовать в `material_id` или `task_id`.

## Диагностика

### Pre-deploy сообщает multiple heads

Проверьте локально:

```powershell
.\.venv\Scripts\python.exe -m alembic heads
```

Нельзя выбирать один head случайно. Создайте merge-миграцию и повторите deploy.

### Приложение запущено, но healthcheck не проходит

Проверьте:

- `DATABASE_URL` ссылается на PostgreSQL того же environment;
- pre-deploy завершился успешно;
- PostgreSQL работает;
- healthcheck настроен именно на `/api/v1/health`.

### Интерфейс возвращает `{"detail":"Not Found"}`

Убедитесь, что используется актуальный Dockerfile с frontend build stage, а Root Directory сервиса не указывает на подкаталог backend или `frontend`.

### Файлы не загружаются или не скачиваются

Проверьте все S3-переменные, особенно `S3_PUBLIC_ENDPOINT_URL`, `S3_ADDRESSING_STYLE` и имя Bucket в reference variables.

## Что не переносится из Docker Compose

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` — они уже входят в `${{Postgres.DATABASE_URL}}`;
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` — Railway Bucket выдаёт собственные credentials;
- контейнеры `minio` и `minio-init`;
- локальные порты и Docker volumes;
- `.env`.
