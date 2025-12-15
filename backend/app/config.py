from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # API Keys
    deepgram_api_key: str = ""
    openai_api_key: str = ""

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000

    # Session settings
    max_session_duration: int = 900  # 15 minutes in seconds
    prompt_interval: int = 15  # minimum seconds between prompts
    context_window_duration: int = 60  # seconds of transcript to keep

    # CORS settings
    cors_origins: list = ["*"]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
