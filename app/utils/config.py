import os
from pathlib import Path

from dotenv import load_dotenv


APP_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = APP_DIR / ".env"
load_dotenv(ENV_PATH)

TEMP_AUDIO_DIR = str(APP_DIR / "temp_audio")
CLEANED_AUDIO_FILENAME = "cleaned_audio.wav"

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_STT_URL = os.getenv("SARVAM_STT_URL", "https://api.sarvam.ai/speech-to-text")

WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL_NAME", "base")
STT_FORCE_PROVIDER = os.getenv("STT_FORCE_PROVIDER", "sarvam").strip().lower()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://127.0.0.1:5000")
BACKEND_PROCESS_PATH = os.getenv("BACKEND_PROCESS_PATH", "/process-text")
BACKEND_CHAT_PATH = os.getenv("BACKEND_CHAT_PATH", "/chat")
BACKEND_SAVE_PATH = os.getenv("BACKEND_SAVE_PATH", "/api/transactions/save")
