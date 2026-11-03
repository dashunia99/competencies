# Исходные матрицы компетенций

- `android.xlsx` — исходная матрица Android.
- `flutter.xlsx` — исходная матрица Flutter.

Файлы читает `scripts/db/seed_matrix.py`. В production Docker-образ они не включаются; для локального `docker-compose` каталог подключается к API-контейнеру только для чтения.
