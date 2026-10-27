# Система управления компетенциями

Backend-сервис для управления компетенциями и обучением сотрудников. API работает на FastAPI, данные хранятся в PostgreSQL, файлы — в S3-совместимом MinIO.

Проект запускается локально через Docker Compose. PostgreSQL и MinIO используют постоянные Docker volumes, поэтому обычная остановка контейнеров не удаляет данные. Для переноса состояния на другой компьютер предусмотрены ZIP-бэкапы.

## Состав окружения

| Сервис | Назначение | Локальный адрес |
|---|---|---|
| `api` | FastAPI и Alembic | `http://localhost:8000` |
| `postgres` | PostgreSQL 16 | `localhost:5432` |
| `minio` | S3 API | `http://localhost:9000` |
| `minio` | Web Console | `http://localhost:9001` |
| `minio-init` | Однократное создание bucket | Публичного порта нет |

Документация API доступна по адресу `http://localhost:8000/docs`, проверка состояния — `http://localhost:8000/api/v1/health`.

## Требования

Для запуска необходимы:

- Git;
- Docker Desktop с поддержкой Docker Compose;
- PowerShell 7 или Windows PowerShell 5.1;
- не менее 2 ГБ свободной оперативной памяти;
- свободные локальные порты `5432`, `8000`, `9000` и `9001`.

Для временного публичного доступа дополнительно потребуется `cloudflared`. Покупать домен для Quick Tunnel не нужно.

### Установка Docker Desktop

На Windows Docker Desktop можно установить через `winget`:

```powershell
winget install --exact --id Docker.DockerDesktop
```

После установки перезагрузите Windows, если установщик этого потребует, запустите Docker Desktop и дождитесь запуска Docker Engine. Для Docker Desktop должна быть включена аппаратная виртуализация; обычно используется backend WSL 2.

Проверьте установку в новом окне PowerShell:

```powershell
docker --version
docker compose version
docker run --rm hello-world
```

Если команда `docker` не найдена, полностью закройте и заново откройте терминал. Подробные требования и альтернативный установщик приведены в [официальной инструкции Docker Desktop для Windows](https://docs.docker.com/desktop/setup/install/windows-install/).

### Установка cloudflared

Этот шаг нужен только для временного доступа к локальному API через интернет:

```powershell
winget install --exact --id Cloudflare.cloudflared
```

Откройте новое окно PowerShell и проверьте установку:

```powershell
cloudflared --version
```

Quick Tunnel работает без аккаунта Cloudflare и без собственного домена. Терминал с `cloudflared` необходимо оставлять открытым всё время публичного доступа.

### Проверка локальных портов

Перед первым запуском проверьте, что необходимые порты не заняты:

```powershell
5432, 8000, 9000, 9001 | ForEach-Object {
    $port = $_
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

    if ($connection) {
        "Порт $port занят процессом PID $($connection[0].OwningProcess)"
    } else {
        "Порт $port свободен"
    }
}
```

Если порт занят, узнать имя процесса можно по выведенному PID:

```powershell
Get-Process -Id <PID>
```

Если порт занимает другой Docker-контейнер, найдите его командой:

```powershell
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

## Первый запуск

### 1. Получить проект

```powershell
git clone <repository-url>
cd competencies
```

### 2. Создать `.env`

```powershell
Copy-Item .env.example .env
```

Откройте `.env` и обязательно замените:

```env
POSTGRES_PASSWORD=change-this-database-password
MINIO_ROOT_PASSWORD=change-this-minio-password
AWS_SECRET_ACCESS_KEY=change-this-minio-password
JWT_SECRET_KEY=replace-this-with-a-random-secret-of-at-least-32-characters
```

`MINIO_ROOT_PASSWORD` и `AWS_SECRET_ACCESS_KEY` должны совпадать. `POSTGRES_PASSWORD` в `DATABASE_URL` также должен совпадать с `POSTGRES_PASSWORD`.

JWT-секрет можно сгенерировать командой:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Значения из `.env` не нужно добавлять в Git. Файл уже исключён через `.gitignore` и `.dockerignore`.

### 3. Собрать и запустить сервисы

```powershell
docker compose up --build -d
```

При первом запуске Docker Compose:

1. создаёт volumes для PostgreSQL и MinIO;
2. ждёт готовности PostgreSQL и MinIO;
3. создаёт bucket из `S3_BUCKET_NAME`;
4. выполняет `alembic upgrade head`;
5. запускает Uvicorn и FastAPI.

Посмотреть состояние:

```powershell
docker compose ps
```

Посмотреть логи API:

```powershell
docker compose logs -f api
```

### 4. Проверить запуск

Откройте:

- `http://localhost:8000/api/v1/health`;
- `http://localhost:8000/docs`;
- `http://localhost:9001` для MinIO Console.

Для входа в MinIO Console используются `MINIO_ROOT_USER` и `MINIO_ROOT_PASSWORD` из `.env`.

## Управление контейнерами

Остановить контейнеры, сохранив данные:

```powershell
docker compose down
```

Запустить их снова:

```powershell
docker compose up -d
```

Пересобрать API после изменения Python-кода или зависимостей:

```powershell
docker compose up --build -d api
```

Полностью удалить контейнеры вместе с PostgreSQL и файлами MinIO:

```powershell
docker compose down -v
```

Команда с `-v` необратимо удаляет локальные данные. Перед её использованием создайте backup.

## База данных и миграции

Структура базы управляется только Alembic. Миграции автоматически применяются при запуске контейнера `api`.

Запустить их вручную:

```powershell
docker compose exec api alembic upgrade head
```

Показать текущую ревизию:

```powershell
docker compose exec api alembic current
```

SQL-файлы из каталога `bd/` не следует применять к Docker-базе: они дублируют Alembic и могут не соответствовать текущей модели.

`seed_demo_data.py` удаляет всю схему `public`, включая данные и таблицу состояния Alembic. Его нельзя запускать в окружении с нужными данными.

Импорт матриц из Excel выполняется отдельно:

```powershell
docker compose exec api python seed_matrix.py
```

При повторном запуске `seed_matrix.py` удаляет и заново создаёт компетенции стеков Android и Flutter.

## Временный публичный доступ

### Только API

После локального запуска выполните в отдельном терминале:

```powershell
cloudflared tunnel --protocol http2 --edge-ip-version 4 --url http://127.0.0.1:8000
```

Команда напечатает временный HTTPS-адрес вида:

```text
https://random-name.trycloudflare.com
```

Дождитесь сообщения `Registered tunnel connection`, затем откройте выданный адрес с суффиксом `/docs`. Адрес работает, пока запущены компьютер, Docker Compose и процесс `cloudflared`. После остановки tunnel адрес перестаёт работать, а при следующем запуске создаётся новый.

### API и presigned-ссылки на файлы

Внутри Docker API обращается к MinIO по адресу `http://minio:9000`. Этот адрес недоступен внешнему пользователю, поэтому для публичного скачивания файлов нужен второй tunnel.

В первом терминале:

```powershell
cloudflared tunnel --protocol http2 --edge-ip-version 4 --url http://127.0.0.1:9000
```

Скопируйте выданный HTTPS-адрес в `.env`:

```env
S3_PUBLIC_ENDPOINT_URL=https://random-storage-name.trycloudflare.com
```

Перезапустите API:

```powershell
docker compose up -d --force-recreate api
```

Во втором терминале откройте tunnel для API:

```powershell
cloudflared tunnel --protocol http2 --edge-ip-version 4 --url http://127.0.0.1:8000
```

MinIO Console на порту `9001` публично открывать не следует. Bucket остаётся приватным, доступ к объектам предоставляется через временные подписанные ссылки.

## Создание backup

PostgreSQL и MinIO должны быть запущены:

```powershell
docker compose up -d postgres minio
```

Создайте архив:

```powershell
.\scripts\backup.ps1
```

Архив появится в каталоге `backups/`:

```text
backups/competencies-backup-YYYYMMDD-HHMMSS.zip
```

Внутри находятся:

```text
database.dump
objects/
backup-info.json
```

На время создания согласованного backup скрипт останавливает API, выгружает PostgreSQL и объекты MinIO, затем снова запускает API. Пароли и `.env` в архив не включаются.

Указать другой каталог для архива:

```powershell
.\scripts\backup.ps1 -OutputDirectory "D:\project-backups"
```

## Импорт существующего backup

Если имеется ZIP-архив backup, сначала подготовьте проект и `.env`, но не запускайте полный стек вручную. Имя bucket `S3_BUCKET_NAME` должно соответствовать окружению, из которого были сохранены данные.

Запустите восстановление:

```powershell
.\scripts\restore.ps1 -BackupPath "C:\path\to\competencies-backup.zip"
```

Скрипт автоматически:

1. распакует и проверит архив;
2. запустит PostgreSQL и MinIO;
3. создаст bucket, если он отсутствует;
4. восстановит PostgreSQL;
5. загрузит файлы в MinIO;
6. соберёт и запустит API;
7. применит миграции через стандартную команду запуска API.

После восстановления проверьте:

```powershell
docker compose ps
docker compose logs api
```

Затем откройте `http://localhost:8000/docs` и проверьте доступ к данным и файлам.

Восстановление перезаписывает объекты с совпадающими ключами и объекты базы из dump. Перед импортом в окружение с нужными данными рекомендуется сначала создать отдельный backup.

## Запуск на другом компьютере

Без backup последовательность выглядит так:

```powershell
git clone <repository-url>
cd competencies
Copy-Item .env.example .env
# Настроить пароли и JWT_SECRET_KEY в .env
docker compose up --build -d
```

Будет создана пустая база с актуальной структурой и пустой bucket.

При наличии backup:

```powershell
git clone <repository-url>
cd competencies
Copy-Item .env.example .env
# Настроить .env
.\scripts\restore.ps1 -BackupPath "C:\path\to\competencies-backup.zip"
```

## Полезные команды

```powershell
# Все логи
docker compose logs -f

# Перезапуск API
docker compose restart api

# Выполнение команды Python внутри API
docker compose exec api python check_db.py

# Открыть psql
docker compose exec postgres psql -U app -d webant_skills

# Список объектов bucket
docker compose run --rm --entrypoint /bin/sh minio-init -c 'mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && mc ls --recursive "local/$S3_BUCKET_NAME"'
```

## Структура проекта

| Путь | Содержание |
|---|---|
| `api/` | Маршруты FastAPI |
| `app/models/` | SQLAlchemy-модели |
| `app/core/` | Конфигурация и S3-клиент |
| `core/` | База данных и безопасность |
| `schemas/` | Pydantic-схемы API |
| `migrations/` | Миграции Alembic |
| `scripts/` | Создание и импорт backup |
| `Dockerfile` | Образ FastAPI |
| `docker-compose.yml` | Локальный стек приложения |

## Диагностика

Если API не запускается:

```powershell
docker compose logs postgres
docker compose logs minio
docker compose logs minio-init
docker compose logs api
```

Если Quick Tunnel показывает `502 Bad Gateway` или Cloudflare `Error 1033`:

1. убедитесь, что `http://127.0.0.1:8000/api/v1/health` открывается локально;
2. не закрывайте терминал с `cloudflared`;
3. дождитесь строки `Registered tunnel connection`;
4. используйте новый адрес, выданный при текущем запуске, а не URL предыдущего tunnel;
5. разрешите `cloudflared.exe` в брандмауэре Windows и временно отключите VPN или прокси, если соединение продолжает обрываться.

Проверить API из PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
```

Если порт занят, остановите использующий его процесс либо измените левую часть соответствующего `ports` в `docker-compose.yml`.

Если были изменены `POSTGRES_DB`, `POSTGRES_USER` или `POSTGRES_PASSWORD` после первого запуска, существующий PostgreSQL volume продолжит использовать старые реквизиты. Создайте backup, удалите volumes и запустите окружение заново либо верните прежние значения.
