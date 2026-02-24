from pydantic import BaseModel
from typing import Optional

# Користувач
class UserCreate(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str

    class Config:
        orm_mode = True

# Задача
class MatrixTaskCreate(BaseModel):
    user_id: int
    n: int
    matrix_data: str  
    vector_b: str     
    status: Optional[str] = "PENDING"
    progress: Optional[int] = 0

class MatrixTaskOut(BaseModel):
    id: int
    user_id: int
    n: int
    matrix_data: str
    vector_b: str
    status: str
    progress: int

    class Config:
        orm_mode = True
