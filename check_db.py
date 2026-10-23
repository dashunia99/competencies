import os

# Заставляем библиотеку выводить ошибки на чистом английском языке:
os.environ["LC_ALL"] = "C"
os.environ["PGCLIENTENCODING"] = "UTF-8"

import psycopg2

try:
    print("Подключаемся к PostgreSQL...")
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        user="postgres",
        password="223112",  # <-- напиши здесь свой пароль (например 1324354657)
        dbname="postgres"
    )
    cur = conn.cursor()
    cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false;")
    dbs = cur.fetchall()

    print("\n✅ УСПЕХ! Твои базы данных:")
    for db in dbs:
        print(f"  👉 {db[0]}")
    conn.close()

except Exception as e:
    print(f"\n❌ НАСТОЯЩАЯ ПРИЧИНА ОШИБКИ: {e}")