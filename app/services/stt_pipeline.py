from typing import Dict
from app.services.audio_preprocessing import preprocess_audio
from app.services.sarvam_stt import transcribe_with_sarvam
from app.services.whisper_stt import transcribe_with_whisper
from app.services.quality_evaluator import evaluate_transcript
from app.utils.logger import logger

def run_stt_pipeline(audio_path: str) -> Dict:
    logger.info(f"STT pipeline started for {audio_path}")
    cleaned_path = preprocess_audio(audio_path)

    sarvam_result = {"text": "", "confidence": 0.0}
    sarvam_eval = {"is_valid": False, "score": 0.0, "issues": ["Sarvam did not run"]}

    try:
        sarvam_result = transcribe_with_sarvam(cleaned_path)
        sarvam_eval = evaluate_transcript(sarvam_result["text"])
    except Exception as sarvam_error:
        logger.error("Sarvam STT failed: %s", sarvam_error)
        logger.info("Fallback trigger: switching to Whisper")

    if sarvam_eval["is_valid"] and sarvam_result["text"]:
        logger.info("Sarvam output accepted")
        final_message = sarvam_result["text"]
        return {
            "message": final_message,
            "final_text": sarvam_result["text"],
            "source": "sarvam",
            "confidence": sarvam_result["confidence"],
            "audio_path": "",
            "debug": {
                "sarvam_text": sarvam_result["text"],
                "whisper_text": None,
                "evaluation": sarvam_eval
            }
        }

    logger.info("Sarvam output invalid, running Whisper fallback")
    whisper_result = transcribe_with_whisper(cleaned_path)
    whisper_eval = evaluate_transcript(whisper_result["text"])
    source = "whisper"

    logger.info("Final selection: whisper fallback")
    final_message = whisper_result["text"]
    return {
        "message": final_message,
        "final_text": whisper_result["text"],
        "source": source,
        "confidence": whisper_result["confidence"],
        "audio_path": "",
        "debug": {
            "sarvam_text": sarvam_result["text"],
            "whisper_text": whisper_result["text"],
            "fallback_used": True,
            "primary_provider": "sarvam",
            "evaluation": {
                "sarvam": sarvam_eval,
                "whisper": whisper_eval
            }
        }
    }
