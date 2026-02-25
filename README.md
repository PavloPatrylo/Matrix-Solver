# Matrix Solver

A web application for solving systems of linear equations using **Cramer's rule**. The solution is computed asynchronously via Celery workers, allowing users to track progress in real time.

## Features

- User registration and JWT-based authentication
- Submit matrix systems (up to 12×12) for solving
- Asynchronous task processing with Celery + Redis
- Real-time progress tracking per task
- Task history with results and execution time
- Input via keyboard or `.txt` file upload
- Cancel in-progress tasks
- Scalable backend with multiple FastAPI replicas behind Nginx

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) |
| Backend | ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54) ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)|
| Task Queue | ![Celery](https://img.shields.io/badge/celery-%23a9cc54.svg?style=for-the-badge&logo=celery&logoColor=ddf4a4) |
| Message Broker / Result Backend | ![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white) |
| Database | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white) |
| Reverse Proxy | ![Nginx](https://img.shields.io/badge/nginx-%23009639.svg?style=for-the-badge&logo=nginx&logoColor=white) |
| Containerization | ![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white) |

## Project Structure

```
.
├── backend/
│   └── app/
│       ├── main.py          # FastAPI app entry point
│       ├── auth.py          # Registration, login, JWT
│       ├── tasks.py         # Celery task (Cramer's rule solver)
│       ├── tasks_routes.py  # REST endpoints for tasks
│       ├── models.py        # SQLAlchemy ORM models
│       ├── schemas.py       # Pydantic schemas
│       ├── crud.py          # DB helper functions
│       ├── db.py            # DB engine and session
│       └── celery_app.py    # Celery configuration
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── nginx/
│   └── default.conf
├── create_tables.py         # DB initializer (runs on startup)
├── test_task.py             # CLI tool for testing solver
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/)

### Configuration

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:yourpassword@db:5432/matrix_solver
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
POSTGRES_DB=matrix_solver
SECRET_KEY=your-secret-key-here
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_BACKEND_URL=redis://redis:6379/1
```

### Running the Application

```bash
# Build and start all services
docker compose up --build

# Initialize the database tables (first run)
docker compose run --rm backend python create_tables.py
```

The app will be available at **http://localhost**.

API documentation (Swagger UI) is available at **http://localhost/docs**.

### Stopping

```bash
docker compose down
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Log in and receive JWT |
| `GET` | `/auth/me` | Get current user info |
| `POST` | `/tasks` | Submit a new matrix task |
| `GET` | `/tasks` | List all tasks for the current user |
| `GET` | `/tasks/{id}/status` | Poll task status and progress |
| `DELETE` | `/tasks/{id}` | Cancel an in-progress task |

## Input Format

### Keyboard Input

Enter the matrix row by row (space-separated values), then the right-hand side vector (space-separated):

```
2 1 -1
-3 -1 2
-2 1 2
---
8 -11 -3
```

### File Upload (`.txt`)

The file must contain the matrix, a line with `---`, and then the vector:

```
3 7 12
9 1 19
5 3 17
---
21 23 36
```

## Limitations

- Maximum matrix size: **12×12** (due to the exponential complexity of Cramer's rule)
- Maximum concurrent active tasks per user: **10**

## CLI Testing Tool

You can test the Celery solver directly without the web UI:

```bash
python test_task.py
```

Follow the prompts to enter data from the keyboard or a `.txt` file. Requires a running Redis instance and Celery worker.

## License

MIT License — see [LICENSE](LICENSE) for details.
