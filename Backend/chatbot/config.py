from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[1]
CHATBOT_DIR = Path(__file__).resolve().parent

# Prefer Backend/.env, allow chatbot/.env as a fallback location.
load_dotenv(BASE_DIR / ".env")
load_dotenv(CHATBOT_DIR / ".env", override=False)


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql://" + url.removeprefix("postgres://")
    return url


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _get_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    try:
        return float(value)
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    DATABASE_URL: str
    GOOGLE_API_KEY: str
    GEMINI_MODEL: str
    LLM_TEMPERATURE: float
    MEMORY_API_URL: str
    DEBUG: bool

    # Supports existing dict-style access in some modules.
    def __getitem__(self, key: str):
        return getattr(self, key)


database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError("Missing required environment variable: DATABASE_URL")
google_api_key = os.getenv("GOOGLE_API_KEY")

if not database_url:
    raise RuntimeError("Missing required environment variable: DATABASE_URL")
if not google_api_key:
    raise RuntimeError("Missing required environment variable: GOOGLE_API_KEY")


settings = Settings(
    DATABASE_URL=_normalize_database_url(database_url),
    GOOGLE_API_KEY=google_api_key,
    GEMINI_MODEL=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
    LLM_TEMPERATURE=_get_float("LLM_TEMPERATURE", 0.2),
    MEMORY_API_URL=os.getenv("MEMORY_API_URL", "http://localhost:3000/history"),
    DEBUG=os.getenv("DEBUG", "false").lower() in ("true", "1", "yes"),
)