from typing import Dict
import os
from app.services.audio_preprocessing import preprocess_audio
from app.services.sarvam_stt import transcribe_with_sarvam
from app.services.whisper_stt import transcribe_with_whisper
from app.services.quality_evaluator import evaluate_transcript
from app.services.text_preprocessing import preprocess_transcript
from app.utils.config import STT_FORCE_PROVIDER
from app.utils.logger import logger


def _score_candidate(stt_confidence: float, quality_eval: Dict) -> float:
    quality_score = float(quality_eval.get("score", 0.0))
    confidence_score = max(0.0, min(1.0, float(stt_confidence or 0.0)))
    return round((confidence_score * 0.45) + (quality_score * 0.55), 3)


def _confidence_engine(stt_confidence: float, quality_eval: Dict, normalized_text: str) -> Dict:
    pattern_match = 1.0 if any(char.isdigit() for char in normalized_text) else 0.0
    rule_consistency = float(quality_eval.get("score", 0.0))
    stt_score = max(0.0, min(1.0, float(stt_confidence or 0.0)))

    final_score = round((stt_score * 0.4) + (rule_consistency * 0.4) + (pattern_match * 0.2), 3)
    return {
        "stt_confidence": stt_score,
        "rule_consistency": rule_consistency,
        "pattern_match": pattern_match,
        "final": final_score,
    }

def run_stt_pipeline(audio_path: str) -> Dict:
    logger.info(f"STT pipeline started for {audio_path}")
    cleaned_path = preprocess_audio(audio_path)
    try:
        sarvam_result = {"text": "", "confidence": 0.0}
        sarvam_eval = {"is_valid": False, "score": 0.0, "issues": ["Sarvam did not run"]}
        sarvam_failed = False

        try:
            sarvam_result = transcribe_with_sarvam(cleaned_path)
            sarvam_eval = evaluate_transcript(sarvam_result["text"])
        except Exception as sarvam_error:
            logger.error("Sarvam STT failed: %s", sarvam_error)
            logger.info("Fallback trigger: switching to Whisper")
            sarvam_failed = True

        force_sarvam = STT_FORCE_PROVIDER == "sarvam"
        sarvam_has_text = bool((sarvam_result.get("text") or "").strip())
        accept_sarvam = sarvam_has_text and (sarvam_eval["is_valid"] or force_sarvam)

        if accept_sarvam:
            logger.info("Sarvam output accepted")
            preprocessed = preprocess_transcript(sarvam_result["text"])
            confidence_engine = _confidence_engine(
                sarvam_result.get("confidence", 0.0),
                sarvam_eval,
                str(preprocessed.get("normalized_text") or ""),
            )
            return {
                "message": preprocessed.get("normalized_text") or sarvam_result["text"],
                "raw_text": sarvam_result["text"],
                "final_text": preprocessed.get("normalized_text") or sarvam_result["text"],
                "source": "sarvam",
                "confidence": confidence_engine["final"],
                "audio_path": "",
                "quality_gate": {
                    "gate_passed": bool(sarvam_eval.get("is_valid", False)),
                    "chosen_provider": "sarvam",
                    "reason": "primary_forced" if force_sarvam and not sarvam_eval.get("is_valid", False) else "primary_valid",
                    "sarvam": sarvam_eval,
                    "whisper": None,
                },
                "preprocessing": preprocessed,
                "confidence_engine": confidence_engine,
                "debug": {
                    "sarvam_text": sarvam_result["text"],
                    "whisper_text": None,
                    "evaluation": sarvam_eval,
                },
            }

        if not sarvam_failed and sarvam_has_text:
            logger.info("Sarvam text exists but fallback needed by configuration/evaluation")

        logger.info("Sarvam output unavailable, running Whisper fallback")
        whisper_result = transcribe_with_whisper(cleaned_path)
        whisper_eval = evaluate_transcript(whisper_result["text"])

        sarvam_score = _score_candidate(sarvam_result.get("confidence", 0.0), sarvam_eval)
        whisper_score = _score_candidate(whisper_result.get("confidence", 0.0), whisper_eval)
        choose_whisper = whisper_score >= sarvam_score

        chosen = whisper_result if choose_whisper else sarvam_result
        chosen_eval = whisper_eval if choose_whisper else sarvam_eval
        chosen_source = "whisper" if choose_whisper else "sarvam"
        selection_reason = "whisper_quality_better" if choose_whisper else "sarvam_quality_better_despite_fallback"

        logger.info("Final selection after compare: %s", chosen_source)
        preprocessed = preprocess_transcript(chosen.get("text", ""))
        confidence_engine = _confidence_engine(
            chosen.get("confidence", 0.0),
            chosen_eval,
            str(preprocessed.get("normalized_text") or ""),
        )

        return {
            "message": preprocessed.get("normalized_text") or chosen.get("text", ""),
            "raw_text": chosen.get("text", ""),
            "final_text": preprocessed.get("normalized_text") or chosen.get("text", ""),
            "source": chosen_source,
            "confidence": confidence_engine["final"],
            "audio_path": "",
            "quality_gate": {
                "gate_passed": bool(chosen_eval.get("is_valid", False)),
                "chosen_provider": chosen_source,
                "reason": selection_reason,
                "sarvam": {**sarvam_eval, "combined_score": sarvam_score},
                "whisper": {**whisper_eval, "combined_score": whisper_score},
                "needs_confirmation": confidence_engine["final"] < 0.6,
            },
            "preprocessing": preprocessed,
            "confidence_engine": confidence_engine,
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
    finally:
        try:
            os.remove(cleaned_path)
        except OSError:
            logger.warning("Could not delete cleaned audio file: %s", cleaned_path)
