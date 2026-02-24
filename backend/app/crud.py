# backend/app/crud.py
from sqlalchemy.orm import Session
from datetime import datetime
from backend.app import models, schemas


def create_user(db: Session, user: schemas.UserCreate):
    """Створити нового користувача"""
    db_user = models.User(
        username=user.username,
        email=f"{user.username}@example.com",  
        password_hash=user.password 
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user_by_username(db: Session, username: str):
    """Знайти користувача за username"""
    return db.query(models.User).filter(models.User.username == username).first()




def create_matrix_task(db: Session, task: schemas.MatrixTaskCreate):
    """Створити нову задачу"""
    db_task = models.MatrixTask(
        user_id=task.user_id,
        matrix_data=task.matrix_data,
        vector_data=task.vector_data,
        status="PENDING",
        created_at=datetime.utcnow()
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def get_user_tasks(db: Session, user_id: int):
    """Отримати всі задачі користувача"""
    return db.query(models.MatrixTask).filter(models.MatrixTask.user_id == user_id).all()


def get_task(db: Session, task_id: int):
    """Отримати задачу за ID"""
    return db.query(models.MatrixTask).filter(models.MatrixTask.id == task_id).first()


def update_task_status(db: Session, task_id: int, status: str):
    """Оновити статус задачі"""
    task = db.query(models.MatrixTask).filter(models.MatrixTask.id == task_id).first()
    if task:
        task.status = status
        if status == "DONE":
            task.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(task)
    return task


def delete_task(db: Session, task_id: int):
    """Видалити задачу"""
    task = db.query(models.MatrixTask).filter(models.MatrixTask.id == task_id).first()
    if task:
        db.delete(task)
        db.commit()
    return task
