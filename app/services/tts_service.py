from __future__ import annotations

import os
import re
import uuid
from typing import Optional

from gtts import gTTS

from app.utils.config import TEMP_AUDIO_DIR
from app.utils.logger import logger


def generate_unique_filename(prefix: str = "tts", extension: str = ".mp3") -> str:
    """Generate a unique file name for synthesized speech output."""
    return f"{prefix}_{uuid.uuid4().hex}{extension}"


def _detect_language(text: str) -> str:
    """Bonus auto-detection: English text -> en, otherwise Hindi -> hi."""
    if re.search(r"[A-Za-z]", text):
        return "en"
    return "hi"


def text_to_speech(text: str, lang: str = "hi") -> Optional[str]:
    """Convert text to speech and return the generated mp3 file path."""
    logger.info("TTS request received. Text: %s", text)

    if not text or not text.strip():
        logger.error("TTS generation failed: text is empty")
        return None

    try:
        os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)

        selected_lang = lang or _detect_language(text)
        if lang == "hi" and re.search(r"[A-Za-z]", text):
            selected_lang = _detect_language(text)

        filename = generate_unique_filename()
        output_path = os.path.join(TEMP_AUDIO_DIR, filename)

        tts = gTTS(text=text.strip(), lang=selected_lang)
        tts.save(output_path)

        logger.info("TTS output saved to: %s", output_path)
        return output_path
    except Exception as exc:
        logger.error("TTS generation failed: %s", exc)
        return None
