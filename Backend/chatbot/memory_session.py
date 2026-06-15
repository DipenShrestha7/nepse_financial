import httpx
from typing import Optional, List, Dict

try:
    from .config import settings
except ImportError:
    import importlib
    settings = importlib.import_module("config").settings

MEMORY_API = settings["MEMORY_API_URL"].rstrip("/")


async def store_history(user_id: Optional[int], question: str, answer: str, session_id: Optional[str] = None, client_temp_id: Optional[str] = None) -> Optional[str]:
    """Send message/question+answer pair to the memory service and return session_id.

    The payload keys used by the memory service may vary; this function follows
    the existing backend convention of `question`/`answer`.
    """
    payload = {"user_id": user_id, "question": question, "answer": answer}
    if session_id:
        payload["session_id"] = session_id
    if client_temp_id:
        payload["client_temp_id"] = client_temp_id

    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{MEMORY_API}", json=payload, timeout=10.0)
        resp.raise_for_status()
        return resp.json().get("session_id")


async def get_session(session_id: str) -> dict:
    """Fetch a session object (including its messages) from the memory service."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{MEMORY_API}/{session_id}", timeout=10.0)
        resp.raise_for_status()
        return resp.json()


async def get_recent_messages(session_id: str, user_count: int = 2, assistant_count: int = 2) -> List[Dict[str, str]]:
    """Return the most recent `user_count` user messages and `assistant_count` assistant messages.

    The function retrieves the session from the memory API, normalizes the message
    shape, selects the last N messages per role, and returns them in chronological
    order as a list of dicts with `role` and `content` keys.
    """
    session = await get_session(session_id)

    # memory service typically returns a `messages` array; be robust to variants
    messages = session.get("messages") or session.get("data") or session.get("messages_list") or []

    normalized = []
    for m in messages:
        # Support a few common shapes: {role, content} or {role, message} or {message, answer}
        role = m.get("role") or m.get("sender")
        content = m.get("content") or m.get("message") or m.get("answer") or m.get("text")
        created_at = m.get("created_at") or m.get("createdAt") or m.get("timestamp")

        # Fallback guesses
        if not role:
            # if there is an `answer` key, treat as assistant
            role = "assistant" if m.get("answer") else "user"
        if content is None:
            content = ""

        normalized.append({"role": role, "content": content, "created_at": created_at})

    # pick the last N per role
    user_msgs = [m for m in normalized if m["role"] == "user"][-user_count:]
    assistant_msgs = [m for m in normalized if m["role"] == "assistant"][-assistant_count:]

    combined = user_msgs + assistant_msgs

    # Try to order chronologically if timestamps exist
    if any(m.get("created_at") for m in combined):
        def _key(m):
            return m.get("created_at") or ""

        combined.sort(key=_key)
    else:
        # Preserve original session ordering for the selected messages
        # Build a set of tuples to match reliably
        selected = {(m["role"], m["content"], m.get("created_at")) for m in combined}
        ordered = []
        for m in normalized:
            t = (m["role"], m["content"], m.get("created_at"))
            if t in selected:
                ordered.append(m)
        combined = ordered

    # return only role/content
    return [{"role": m["role"], "content": m["content"]} for m in combined]