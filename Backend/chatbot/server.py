from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os;
from .routes import router


app = FastAPI(title="NEPSE Chatbot Service")
allowed_origins=[
    "http://localhost:5173",
    "http://localhost:517",
    os.getenv("FASTIFY_URL")
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin for origin in allowed_origins if origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "nepse-chatbot"}
