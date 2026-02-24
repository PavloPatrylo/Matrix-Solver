# create_tables.py

from backend.app.db import Base, engine
from backend.app import models 
from sqlalchemy.exc import OperationalError
import time
import sys

print("Спроба підключення до бази даних...")

retries = 10
delay = 5
while retries > 0:
    try:
        with engine.connect() as connection:
            print(">>> Успішне з'єднання з базою даних.")
            break
    except OperationalError as e:
        print(f"Помилка підключення до БД: {e}")
        print(f"Контейнер 'db' ще завантажується? Залишилось спроб: {retries}")
        retries -= 1
        time.sleep(delay)
        if retries == 0:
            print("\n!!! НЕ ВДАЛОСЯ ПІДКЛЮЧИТИСЯ ДО БАЗИ ДАНИХ !!!")
            print("Вихід.")
            sys.exit(1) 

try:
    print("\nСтворення таблиць (якщо вони ще не існують)...")
    

    Base.metadata.create_all(bind=engine)
    
    print("---------------------------------------------------------")
    print("Успіх! Таблиці успішно створено (або вже існували).")
    print("---------------------------------------------------------")

except Exception as e:
    print("\n!!! СТАЛАСЯ ПОМИЛКА ПІД ЧАС СТВОРЕННЯ ТАБЛИЦЬ !!!")
    print(f"\nДеталі помилки: {e}")