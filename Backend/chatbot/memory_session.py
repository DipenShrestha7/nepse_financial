import asyncio
import httpx
from typing import Optional

try:
    from .config import settings
except Exception:
    from config import settings

MEMORY_API = settings["MEMORY_API_URL"].rstrip("/")


async def store_history(user_id: Optional[int], question: str, answer: str, session_id: Optional[str] = None, client_temp_id: Optional[str] = None) -> str:
    """Send message history to the Node memory service.

    Returns the session_id created or provided by the memory service.
    """
    payload = {
        "user_id": user_id,
        "message": question,
        "answer": answer,
    }
    if session_id:
        payload["session_id"] = session_id
    if client_temp_id:
        payload["client_temp_id"] = client_temp_id

    async with httpx.AsyncClient() as client:
        resp = await client.post(MEMORY_API, json=payload, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()

    return data.get("session_id") or session_id


async def get_session(session_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{MEMORY_API}/{session_id}", timeout=10.0)
        resp.raise_for_status()
        return resp.json()
# Backend/chatbot/memory_session.py
import httpx
from .config import settings

MEMORY_API = settings["MEMORY_API_URL"].rstrip("/")

async def store_history(user_id, question, answer, session_id=None, client_temp_id=None):
    payload = {"user_id": user_id, "question": question, "answer": answer}
    if session_id:
        payload["session_id"] = session_id
    if client_temp_id:
        payload["client_temp_id"] = client_temp_id
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{MEMORY_API}", json=payload, timeout=10.0)
        resp.raise_for_status()
        return resp.json().get("session_id")

async def get_session(session_id):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{MEMORY_API}/{session_id}", timeout=10.0)
        resp.raise_for_status()
        return resp.json()