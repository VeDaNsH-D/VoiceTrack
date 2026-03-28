import logging
import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse
from app.services.stt_pipeline import run_stt_pipeline

router = APIRouter()
logger = logging.getLogger(__name__)
TEMP_DIR = "app/temp_audio"

@router.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    logger.info("/stt request received")
    if not file.content_type.startswith("audio/"):
        logger.error("Invalid audio format: %s", file.content_type)
        raise HTTPException(status_code=400, detail="Invalid audio file format.")
    os.makedirs(TEMP_DIR, exist_ok=True)
    temp_path = os.path.join(TEMP_DIR, file.filename)
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info("STT started for %s", temp_path)
        try:
            text, confidence = run_stt_pipeline(temp_path)
            source = "sarvam/whisper"
        except Exception as e:
            logger.error("STT pipeline failed: %s", str(e))
            logger.info("Fallback triggered for %s", temp_path)
            text, confidence, source = "", 0.0, "fallback"
        logger.info("STT output: %s", text)
        return {"text": text, "source": source, "confidence": confidence}
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass
