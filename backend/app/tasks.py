# backend/app/tasks.py

from celery import shared_task
import json

from backend.app.db import SessionLocal
from backend.app.models import MatrixTask
from datetime import datetime 

def determinant_laplace(matrix):
    """(Ця функція залишається без змін)"""
    n = len(matrix)
    if n == 1:
        return matrix[0][0]
    if n == 2:
        return matrix[0][0]*matrix[1][1] - matrix[0][1]*matrix[1][0]

    det = 0
    for c in range(n):
        minor = [row[:c] + row[c+1:] for row in matrix[1:]]
        det += ((-1)**c) * matrix[0][c] * determinant_laplace(minor)
    return det


@shared_task(bind=True, acks_late=True)
def solve_cramer(self, A, b, db_task_id: int):
    
    db = SessionLocal()
    task = None 
    
    try:
        task = db.query(MatrixTask).filter(MatrixTask.id == db_task_id).first()
        if not task:
            print(f"Помилка: не знайдено задачу з ID {db_task_id} в БД.")
            return {"error": "Task ID not found in DB"}

        n = len(A)
        det_A = determinant_laplace(A)

        if det_A == 0:
            raise ValueError("Система не має єдиного розв'язку (detA = 0)")

        x = []
        total_steps = n
        for i in range(n):
            Ai = [row[:] for row in A]
            for j in range(n):
                Ai[j][i] = b[j]

            det_Ai = determinant_laplace(Ai)
            xi = det_Ai / det_A
            x.append(xi)
            
            progress = round((i+1)/total_steps * 100, 2)
            self.update_state(state='PROGRESS', meta={'progress': progress})

        task.result = json.dumps(x) 
        task.status = "DONE"
        task.completed_at = datetime.utcnow()
        
        return {"result": x, "progress": 100}

    except Exception as e:
        if task: 
            task.status = "FAILED"
            task.result = json.dumps({"error": str(e)})
            task.completed_at = datetime.utcnow()
        
        raise e

    finally:
        if db:
            db.commit() 
            db.close()