# Подготовка frontend к production

Этот документ описывает изменения, необходимые перед публикацией React-приложения как рабочего frontend для FastAPI. Текущая версия успешно собирается через Vite, но остаётся демонстрационным интерфейсом: основная часть данных хранится в `App.jsx`, авторизация выполняется локально, а изменения не записываются в PostgreSQL.

## Целевая схема размещения

Для текущего проекта рекомендуется один публичный origin:

```text
https://skills.example.com/          -> React SPA
https://skills.example.com/api/v1/*  -> FastAPI
https://skills.example.com/docs      -> Swagger (только для разработки)
```

Frontend продолжает обращаться к относительному адресу `/api/v1`. В этом варианте браузер не выполняет cross-origin запросы и CORS для frontend не требуется.

Frontend и backend при этом могут быть:

- одним Docker-образом: FastAPI раздаёт собранный `frontend/dist`;
- разными Railway-сервисами: Caddy раздаёт frontend и проксирует `/api/*` в приватный backend-сервис.

Для текущего размера проекта допустим первый вариант. Для независимых деплоев и масштабирования предпочтительнее второй.

## 1. Удалить демонстрационную авторизацию

Сейчас `App.jsx` содержит пользователей и пароли в открытом виде:

```text
admin@webant.ru / admin123password
expert@webant.ru / expert123password
employee@webant.ru / employee123password
```

Необходимо:

1. Удалить `INITIAL_USERS` с паролями из browser bundle.
2. Удалить кнопки быстрого входа и `handleQuickLogin` из production-интерфейса.
3. Удалить сравнение email и пароля внутри React.
4. Вызывать `POST /api/v1/auth/login` через `loginApi()`.
5. После входа загружать профиль через `GET /api/v1/auth/me`.
6. Определять роль, пользователя, стек и грейд только из ответа backend.
7. При выходе удалять клиентское состояние авторизации и серверную refresh-сессию, если она будет добавлена.
8. Сменить пароли демонстрационных аккаунтов в существующей production БД.
9. Не запускать `seed_demo_data.py` в production. Если тестовые данные необходимы для стенда, использовать отдельное окружение и уникальные секреты.

Frontend не должен считаться границей безопасности. Проверки ролей должны оставаться в FastAPI для каждого защищённого endpoint, даже если соответствующая кнопка скрыта в интерфейсе.

## 2. Реально подключить JWT

В `src/api.js` уже есть заготовка для `Authorization: Bearer`, но `App.jsx` её не использует.

Минимальный вариант:

1. Получать `access_token` и `refresh_token` через `/auth/login`.
2. Добавлять access token ко всем защищённым запросам:

   ```http
   Authorization: Bearer <access_token>
   ```

3. При `401` один раз вызывать `POST /api/v1/auth/refresh`.
4. Повторять исходный запрос с новым access token.
5. Если refresh неуспешен, полностью завершать сессию и показывать форму входа.
6. Восстанавливать сессию при перезагрузке страницы через `/auth/me`, а не через захардкоженного пользователя.

### Рекомендуемое хранение токенов

Наиболее безопасная схема для браузерного приложения:

- короткоживущий access token хранится только в памяти React;
- refresh token хранится сервером в cookie с `HttpOnly`, `Secure` и подходящим `SameSite`;
- backend предоставляет login, refresh и logout с cookie;
- для изменяющих запросов учитывается CSRF-защита, если cookie отправляется автоматически.

Для этой схемы потребуется изменить backend: сейчас refresh token возвращается в JSON.

Хранение JWT в `localStorage`, как в текущем `api.js`, проще, но токен доступен любому JavaScript-коду на странице при XSS. Если временно используется `localStorage`, необходимо как минимум:

- не хранить там refresh token надолго;
- установить короткий срок жизни access token;
- не вставлять непроверенный HTML через `dangerouslySetInnerHTML`;
- добавить строгую Content Security Policy;
- очищать токены при `401`, выходе и блокировке пользователя.

## 3. Заменить mock-данные запросами к API

Нужно удалить или оставить только в Storybook/тестах следующие production-источники данных:

- `REAL_STACKS`;
- `INITIAL_USERS`;
- `LEARNING_PROGRAMS`;
- `INITIAL_TASKS`;
- локальные submissions и статусы заданий.

Необходимые соответствия:

| Функция интерфейса | Backend endpoint |
|---|---|
| Вход | `POST /api/v1/auth/login` |
| Текущий профиль | `GET /api/v1/auth/me` |
| Обновление токена | `POST /api/v1/auth/refresh` |
| Пользователи | `GET /api/v1/users/` |
| Создание пользователя | `POST /api/v1/users/` |
| Изменение профиля/стека/роли | `PATCH /api/v1/users/{user_id}` |
| Блокировка | `POST /api/v1/users/{user_id}/block` |
| Направления | `GET /api/v1/directions` |
| Грейды | `GET /api/v1/grades` |
| Блоки матрицы | `GET /api/v1/matrices/blocks` |
| Компетенции | `GET /api/v1/matrices/competencies` |
| Программы | `GET /api/v1/programs/` |
| Программа | `GET /api/v1/programs/{program_id}` |
| Программы пользователя | `GET /api/v1/users/{user_id}/programs` |
| Назначение программы | `POST /api/v1/users/{user_id}/programs` |
| Обзор сотрудника | `GET /api/v1/users/me/overview` |
| Карточка задания | `GET /api/v1/assignments/{task_id}` |
| Начать задание | `POST /api/v1/assignments/{task_id}/start` |
| Сдать задание | `POST /api/v1/assignments/{task_id}/submit` |
| Очередь эксперта | `GET /api/v1/expert/submissions` |
| Карточка сдачи | `GET /api/v1/submissions/{submission_id}` |
| Проверить работу | `POST /api/v1/submissions/{submission_id}/review` |

Текущий `src/api.js` ошибочно использует:

- `POST /api/v1/submissions` для сдачи;
- `PATCH /api/v1/submissions/{id}/review` для проверки.

Их нужно заменить endpoint’ами из таблицы и сверить JSON payload с актуальными Pydantic-схемами.

Загруженные `dbMatrixBlocks` и `dbPrograms` должны использоваться при рендеринге. Сейчас они записываются в state, но экран продолжает показывать константы.

## 4. Организовать API-клиент

Следует оставить один общий клиент вместо прямых `fetch()` по всему `App.jsx`.

API-клиент должен:

- иметь единый `API_BASE`;
- добавлять access token;
- обрабатывать JSON и ответы без тела (`204 No Content`);
- не устанавливать `Content-Type: application/json` для `FormData`;
- различать `401`, `403`, `404`, `409`, `422`, `429` и `5xx`;
- поддерживать отмену запроса через `AbortController`;
- не выполнять бесконечный refresh/retry;
- преобразовывать backend error detail в безопасное пользовательское сообщение;
- логировать технические ошибки без токенов, паролей и персональных данных.

`App.jsx` размером более 1800 строк следует разделить минимум на:

- страницы;
- компоненты;
- API-модули по доменам;
- auth provider/context;
- hooks загрузки данных;
- типы или схемы DTO.

Желательно перейти на TypeScript либо добавить runtime-валидацию ответов, чтобы изменения backend-контрактов обнаруживались до production.

## 5. Настроить production API address

### Один публичный домен

Оставить:

```js
const API_BASE = '/api/v1';
```

Нужно настроить сервер так, чтобы `/api/*` всегда попадал в FastAPI, а остальные пути — во frontend SPA.

### Разные публичные домены

В коде использовать:

```js
const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;
```

В Railway frontend service:

```env
VITE_API_URL=https://${{competencies.RAILWAY_PUBLIC_DOMAIN}}
```

В Railway backend service:

```env
CORS_ALLOWED_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

Имена `competencies` и `frontend` должны совпадать с именами сервисов Railway.

Все переменные с префиксом `VITE_` попадают в публичный JavaScript bundle. В них запрещено помещать:

- `DATABASE_URL`;
- `JWT_SECRET_KEY`;
- AWS/S3 secret key;
- пароли;
- приватные токены.

## 6. Собрать и раздавать frontend в production

Текущий корневой Dockerfile собирает только FastAPI. Для одного контейнера необходимо:

1. Добавить Node build stage.
2. Выполнить в нём `npm ci` и `npm run build`.
3. Скопировать `frontend/dist` в финальный Python-образ.
4. Настроить FastAPI или reverse proxy на раздачу файлов.
5. Не копировать `frontend/node_modules` и локальный `frontend/dist` в Docker context.

Рекомендуемые записи `.dockerignore`:

```text
frontend/node_modules
frontend/dist
```

FastAPI/static server должен обеспечить:

- `/` -> `index.html`;
- `/assets/*` -> собранные JS/CSS/изображения;
- SPA fallback на `index.html` только для frontend-маршрутов;
- `/api/*`, `/docs`, `/redoc`, `/openapi.json` не должны перехватываться SPA fallback;
- корректные cache headers: долгий immutable cache для хешированных assets и без долгого cache для `index.html`;
- gzip или Brotli.

Если frontend разворачивается отдельным сервисом, нужен production static server, например Caddy. `vite preview` допустим для временного стенда, но не рекомендуется как production server.

## 7. Файлы и S3

Нельзя имитировать прикрепление файла строкой вроде `submission.zip`.

Нужно реализовать backend-предусмотренный поток:

1. Получить разрешение/endpoint загрузки через content API.
2. Загрузить реальный файл в S3/Railway Bucket.
3. Сохранить возвращённый `object_key` при создании submission.
4. Для скачивания получать presigned URL от backend.

Frontend должен ограничивать:

- максимальный размер файла;
- разрешённые MIME-типы и расширения;
- количество файлов;
- повторную отправку формы во время загрузки.

Проверка frontend не заменяет серверную проверку размера, типа, владельца и object key.

## 8. Защита браузерного приложения

На frontend/static server следует настроить заголовки:

```text
Content-Security-Policy
X-Content-Type-Options: nosniff
Referrer-Policy
Permissions-Policy
Strict-Transport-Security
```

`frame-ancestors` в CSP или `X-Frame-Options` должны запрещать встраивание приложения в чужие iframe, если оно не требуется.

Дополнительно:

- не отображать необработанный HTML из API;
- проверять внешние ссылки перед выводом;
- для `target="_blank"` использовать `rel="noopener noreferrer"`;
- не выводить stack trace и внутренние сообщения backend пользователю;
- не логировать JWT, пароли, presigned URLs и персональные данные;
- не считать скрытие кнопки проверкой прав;
- отключить или ограничить `/docs` и `/openapi.json` в production, если они не должны быть публичными;
- задать лимиты запросов на login/refresh на стороне backend;
- использовать только HTTPS.

## 9. Состояния интерфейса

Для каждого запроса нужны:

- loading state;
- empty state;
- error state;
- retry;
- блокировка повторного submit;
- подтверждение успешного сохранения;
- обновление данных после mutation;
- корректная обработка `401` и `403`;
- защита от обновления state после unmount.

Optimistic UI следует использовать только там, где предусмотрен rollback при ошибке API.

## 10. Проверить backend-контракты

Перед релизом нужно сверить frontend с `/openapi.json` или сгенерировать типизированный клиент. Особенно проверить:

- имена ролей и статусов;
- nullable-поля;
- формат дат;
- пагинацию и фильтры;
- response для `204`;
- формат validation errors `422`;
- загрузку `multipart/form-data`;
- срок жизни access/refresh tokens;
- поведение заблокированного пользователя.

Нельзя полагаться на подписи и значения статусов из mock-данных, если backend использует другие enum/string значения.

## 11. Тестирование

Минимальный набор перед production:

### Автоматические проверки

```text
npm ci
npm run lint
npm run build
```

Также нужны:

- unit-тесты API-клиента и auth state;
- component-тесты форм;
- end-to-end тесты против тестового backend;
- проверка bundle на случайно включённые секреты и демонстрационные пароли;
- dependency audit;
- проверка SPA fallback и прямого открытия frontend URL.

### Основные end-to-end сценарии

1. Вход каждой ролью и `/auth/me`.
2. Неверный пароль, заблокированный пользователь, истёкший токен.
3. Refresh token и logout.
4. Создание и изменение пользователя администратором.
5. Назначение стека, грейда и программы.
6. Просмотр программы сотрудником.
7. Старт и сдача задания с файлом.
8. Проверка задания экспертом.
9. Запрет действий с недостаточной ролью.
10. Недоступность API, PostgreSQL или S3.

## 12. Наблюдаемость и эксплуатация

Для production желательно добавить:

- frontend error monitoring;
- release/version identifier;
- source maps, загружаемые только в систему мониторинга;
- web-vitals или аналогичные метрики;
- корреляционный request ID между frontend и backend;
- отдельные production и staging окружения;
- независимые production secrets;
- автоматический build/lint/test перед деплоем.

## Приоритет выполнения

### Блокирует production

1. Удалить открытые пароли и быстрый вход.
2. Подключить настоящую JWT-авторизацию.
3. Заменить mock-состояние реальными API-запросами.
4. Исправить submission/review endpoint’ы.
5. Настроить API address или same-origin proxy.
6. Добавить production static server/build.
7. Сменить все опубликованные демонстрационные пароли.

### Нужно до публичного релиза

1. Безопасное хранение refresh token.
2. CSP и остальные security headers.
3. Полная обработка ошибок и loading states.
4. Реальная загрузка файлов в S3.
5. End-to-end тесты ролей и основных сценариев.
6. Ограничение production Swagger и rate limiting авторизации.

### Можно выполнять после MVP

1. TypeScript или генерация клиента из OpenAPI.
2. Декомпозиция большого `App.jsx`.
3. Error monitoring и web-vitals.
4. Оптимизация bundle и lazy loading.

## Критерий готовности

Frontend можно считать готовым к production, когда после удаления всех mock-констант пользователь может пройти полный сценарий только через FastAPI и после обновления страницы видит то же состояние из PostgreSQL/S3, а в browser bundle отсутствуют пароли, секреты и обходы авторизации.

