from typing import Any, Dict, Optional

import requests

from app.utils.config import BACKEND_BASE_URL, BACKEND_PROCESS_PATH
from app.utils.logger import logger


def structure_transcript(text: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    """Forward transcript text to the backend extraction endpoint."""
    cleaned_text = text.strip()
    if not cleaned_text:
        raise ValueError("Text is required for processing.")

    backend_url = f"{BACKEND_BASE_URL.rstrip('/')}{BACKEND_PROCESS_PATH}"
    logger.info("Forwarding transcript to backend processor: %s", backend_url)

    payload = {"text": cleaned_text, "save": False}
    if user_id and user_id.strip():
        payload["userId"] = user_id.strip()

    response = requests.post(backend_url, json=payload, timeout=60)

    if response.status_code >= 400:
        logger.error("Backend processing failed (%s): %s", response.status_code, response.text)
        raise RuntimeError(f"Backend processing failed with status {response.status_code}")

    return response.json()
