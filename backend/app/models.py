from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from backend.app.db import Base 


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("MatrixTask", back_populates="user")


class MatrixTask(Base):
    __tablename__ = "matrix_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    matrix_data = Column(Text, nullable=False) 
    vector_b = Column(Text, nullable=False) 
    result = Column(Text)
    status = Column(String(50), default="PENDING") 
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

    celery_task_id = Column(String(255), nullable=True, index=True) 

    user = relationship("User", back_populates="tasks")