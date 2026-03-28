import logging
from typing import Tuple

def run_stt_pipeline(audio_path: str) -> Tuple[str, float]:
    """
    Dummy STT pipeline. Replace with actual model inference.
    Args:
        audio_path (str): Path to audio file.
    Returns:
        Tuple[str, float]: (transcribed text, confidence)
    """
    logging.info(f"Running STT pipeline on {audio_path}")
    # TODO: Integrate actual model here
    return ("This is a dummy transcription.", 0.99)
