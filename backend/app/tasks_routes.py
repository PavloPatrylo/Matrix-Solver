# backend/app/tasks_routes.py

from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from backend.app.db import get_db
from backend.app.models import MatrixTask, User
from backend.app.auth import oauth2_scheme
import jwt

from backend.app.tasks import solve_cramer      
from celery.result import AsyncResult      

from backend.app.celery_app import celery_app  


SECRET_KEY = "8CnV4QxIa6Ozrg5n9iDO5zbpxEGDLXa_U4fuh8Hl62Y"
ALGORITHM = "HS256"

router = APIRouter()
# Функція для отримання поточного користувача з токену
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]) # Декодуємо JWT токен
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Створення нової задачі
@router.post("/tasks")
def create_task(matrix_data: str = Form(...),vector_data: str = Form(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    try:
        A = []


        processed_matrix_data = matrix_data.strip().replace(r'\n', '\n')
        
       
        A_lines = processed_matrix_data.splitlines() 
       
        
        for line in A_lines:
            row = list(map(float, line.split()))
            A.append(row)
        
        b = list(map(float, vector_data.strip().split()))
        
        n = len(A)
        if n == 0:
             raise ValueError("Матриця не може бути пустою")
        if any(len(row) != n for row in A):
            raise ValueError("Матриця повинна бути квадратною")
        if len(b) != n:
            raise ValueError("Вектор результатів має бути тієї ж довжини, що й розмірність матриці")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid data format: {str(e)}")


    
    MAX_SIZE = 12 
    if n > MAX_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"Matrix size {n}x{n} is too large. Max allowed is {MAX_SIZE}x{MAX_SIZE} due to Cramer's method complexity."
        )

    MAX_ACTIVE_TASKS = 10 
    active_tasks_count = db.query(MatrixTask).filter(
        MatrixTask.user_id == current_user.id,
        MatrixTask.status.in_(["PENDING", "IN_PROGRESS"])
    ).count()
    
    if active_tasks_count >= MAX_ACTIVE_TASKS:
        raise HTTPException(
            status_code=400, 
            detail=f"Active task limit ({MAX_ACTIVE_TASKS}) reached. Please wait for other tasks to complete before starting new ones."
        )
    



    db_task = MatrixTask(
        user_id=current_user.id,
        matrix_data=matrix_data, 
        vector_b=vector_data,
        status="PENDING"
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    celery_task = solve_cramer.delay(A, b, db_task_id=db_task.id) # Запускаємо фонову задачу Celery

    db_task.celery_task_id = celery_task.id
    db_task.status = "IN_PROGRESS"
    db.commit()

    return { 
        "db_task_id": db_task.id,
        "celery_task_id": celery_task.id,
        "status": db_task.status
    }

# Отримання списку задач користувача
@router.get("/tasks")
def list_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(
            MatrixTask.id,
            MatrixTask.user_id,
            MatrixTask.matrix_data,
            MatrixTask.vector_b,
            MatrixTask.result,
            MatrixTask.status,
            MatrixTask.created_at,
            MatrixTask.completed_at,
            MatrixTask.celery_task_id
        ).filter(MatrixTask.user_id == current_user.id)\
         .order_by(MatrixTask.created_at.desc())\
         .all()

    results = []
    for t in tasks:
        try:
            n = len(t.matrix_data.splitlines()) if t.matrix_data else 0
        except:
            n = 0

        results.append({
            "id": t.id,
            "n": n,
            "status": t.status,
            "result": t.result,
            "celery_id": t.celery_task_id,
            "created_at": t.created_at.isoformat() if t.created_at else None, 
            "completed_at": t.completed_at.isoformat() if t.completed_at else None, 
            "matrix_data": t.matrix_data, 
            "vector_b": t.vector_b      
        })
    return results

# 
@router.get("/tasks/{db_task_id}/status")
def get_task_status(db_task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    
    # 1. Отримуємо завдання з PostgreSQL
    task_in_db = db.query(MatrixTask).filter(
        MatrixTask.id == db_task_id, 
        MatrixTask.user_id == current_user.id
    ).first()

    if not task_in_db:
        raise HTTPException(status_code=404, detail="Task not found or you don't have permission")
        # 2. Отримуємо статус з Celery/Redis
    celery_id = task_in_db.celery_task_id
    db_status = task_in_db.status 
# 3. Визначаємо остаточний статус, прогрес та результат
    if not celery_id:
         return {"status": db_status, "progress": 0, "result": None}
# 4. Отримуємо статус задачі з Redis через Celery
    task_result_redis = AsyncResult(celery_id, app=celery_app)
    redis_status = task_result_redis.status 

    progress = 0
    result = None

    # Визначаємо статус та прогрес на основі інформації з Redis та бази даних
    if redis_status == 'PROGRESS':
        status = "PROGRESS"
        progress = task_result_redis.info.get('progress', 0)

    elif redis_status == 'SUCCESS' or redis_status == 'FAILURE':

        
        if db_status == "IN_PROGRESS":

            status = "PROGRESS" 
            progress = 99       
            
        else:
            
            status = db_status 
            progress = 100
            result = task_in_db.result 

    elif redis_status == 'REVOKED':
        status = "CANCELLED"
        progress = 0
        
    else: 
        status = db_status 

    
    return {
        "db_id": task_in_db.id,
        "status": status,
        "progress": progress,
        "result": result
    }

@router.delete("/tasks/{db_task_id}")
def cancel_task(db_task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Скасовує (зупиняє) виконання задачі, яка ще в процесі.
    """
    
    task = db.query(MatrixTask).filter(
        MatrixTask.id == db_task_id, 
        MatrixTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found or you don't have permission")

    if task.status not in ["PENDING", "IN_PROGRESS"]:
         raise HTTPException(status_code=400, detail=f"Task is already {task.status} and cannot be cancelled")

    if task.celery_task_id:
        celery_app.control.revoke(task.celery_task_id, terminate=True, signal='SIGTERM')
        
    task.status = "CANCELLED"
    db.commit()
    
    return {"message": "Task cancellation request sent.", "db_id": task.id, "status": "CANCELLED"}