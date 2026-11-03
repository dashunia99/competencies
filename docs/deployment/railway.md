# Запуск проекта в Railway

Проект состоит из трёх ресурсов Railway: PostgreSQL, Storage Bucket и API-сервис из этого репозитория. PostgreSQL и Bucket не должны иметь публичный домен: API обращается к ним через credentials и private network.

## 1. Railway PostgreSQL

1. В проекте Railway выберите **Create → Database → PostgreSQL**.
2. Дополнительные таблицы вручную не создавайте.
3. В API-сервисе добавьте reference variable:

   ```env
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```

   `Postgres` — имя сервиса в Railway. Если сервис переименован, замените имя внутри `${{...}}`.

Новая PostgreSQL действительно создаётся пустой. Перед запуском API Railway должен выполнить `alembic upgrade head`: миграции создадут все таблицы, ограничения и таблицу `alembic_version`.

Если миграции применяются не к пустой Railway БД, а к старой локальной базе, сначала сделайте backup. Старая версия `program_items` ссылалась непосредственно на компетенцию, а текущая — на материал или задание. Миграция намеренно остановится при наличии таких старых строк, чтобы не удалить связь молча; их нужно сначала преобразовать в `material_id` или `task_id`.

## 2. Railway Storage Bucket

1. Выберите **Create → Bucket** и создайте bucket в нужном регионе.
2. Bucket уже существует, поэтому отдельный `minio-init` в Railway не нужен.
3. В API-сервисе добавьте reference variables:

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

   `Bucket` — имя bucket-сервиса в Railway. В Credentials конкретного bucket проверьте URL style. Для новых Railway Buckets используется `virtual`; если Railway явно показывает path-style, задайте `path`.

Bucket остаётся приватным. Скачивание файлов выполняется по временным presigned URL, поэтому публичный bucket или отдельный публичный домен не требуется.

## 3. API из репозитория

1. Выберите **Create → GitHub Repo** и подключите этот репозиторий.
2. Railway автоматически найдёт корневой `Dockerfile`.
3. В **Variables** задайте ссылки на PostgreSQL и Bucket из разделов выше, а также секреты приложения:

   ```env
   JWT_SECRET_KEY=<случайная строка длиной не менее 32 символов>
   INITIAL_ADMIN_EMAIL=<email первого администратора>
   INITIAL_ADMIN_PASSWORD=<уникальный пароль длиной не менее 12 символов>
   CORS_ALLOWED_ORIGINS=https://<публичный-домен-frontend>
   ```

   Если frontend-доменов несколько, перечислите их через запятую без пробелов. Если браузерного frontend пока нет, оставьте `CORS_ALLOWED_ORIGINS` пустой строкой. Не используйте `*`, поскольку API допускает credentialed-запросы.

   Секрет можно сгенерировать локально:

   ```powershell
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

4. В **Settings → Deploy → Pre-deploy Command** задайте:

   ```text
   alembic upgrade head
   ```

5. В **Settings → Deploy → Healthcheck Path** задайте:

   ```text
   /api/v1/health
   ```

6. В **Settings → Networking** создайте публичный домен для API.

Start Command переопределять не нужно: `Dockerfile` запускает Uvicorn на `0.0.0.0` и использует предоставленную Railway переменную `PORT`.

## Что не нужно переносить из Docker Compose

- `POSTGRES_DB`, `POSTGRES_USER` и `POSTGRES_PASSWORD` не задаются в API: их уже включает `${{Postgres.DATABASE_URL}}`.
- Контейнеры `minio` и `minio-init` не нужны при использовании Railway Bucket.
- Порты вручную публиковать не нужно.
- `.env` в репозиторий загружать нельзя. Все production-значения задаются во вкладке **Variables** API-сервиса.

## Первая проверка

В логе pre-deploy должна успешно завершиться команда `alembic upgrade head`. После запуска проверьте:

- `https://<домен-api>/api/v1/health`;
- `https://<домен-api>/docs`;
- наличие таблиц во вкладке Data сервиса PostgreSQL;
- загрузку и получение файла через API.

