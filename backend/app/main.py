# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.auth import app as auth_app
from backend.app.tasks_routes import router as tasks_router

main_app = FastAPI(title="Matrix Solver API")

origins = [
    "http://localhost",       
    "http://localhost:8080",   
    "http://127.0.0.1:5500",   
]

main_app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       
    allow_credentials=True,    
    allow_methods=["*"],        
    allow_headers=["*"],    
)

main_app.mount("/auth", auth_app)      
main_app.include_router(tasks_router)  