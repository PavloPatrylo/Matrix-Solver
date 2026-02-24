# Використовуємо офіційний образ Python
FROM python:3.10-slim

# Встановлюємо робочу директорію всередині контейнера
WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

#  код бекенду в контейнер
COPY ./backend ./backend
COPY ./create_tables.py .

# Команда за замовчуванням для запуску FastAPI-сервера
# Nginx буде підключатись до цього порту 8000
CMD ["uvicorn", "backend.app.main:main_app", "--host", "0.0.0.0", "--port", "8000"]