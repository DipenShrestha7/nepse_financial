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
    OPENROUTER_API_KEY: str
    OPENROUTER_MODEL: str
    OPENROUTER_BASE_URL: str
    LLM_TEMPERATURE: float
    MEMORY_API_URL: str
    DEBUG: bool

    # Supports existing dict-style access in some modules.
    def __getitem__(self, key: str):
        return getattr(self, key)


database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError("Missing required environment variable: DATABASE_URL")

openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
if not openrouter_api_key:
    raise RuntimeError("Missing required environment variable: OPENROUTER_API_KEY")


settings = Settings(
    DATABASE_URL=_normalize_database_url(database_url),
    OPENROUTER_API_KEY=openrouter_api_key,
    OPENROUTER_MODEL=os.getenv("OPENROUTER_MODEL", "openrouter/free"),
    OPENROUTER_BASE_URL=os.getenv(
        "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
    ),
    LLM_TEMPERATURE=_get_float("LLM_TEMPERATURE", 0.2),
    MEMORY_API_URL=os.getenv("MEMORY_API_URL", "http://localhost:3000/history"),
    DEBUG=os.getenv("DEBUG", "false").lower() in ("true", "1", "yes"),
)
