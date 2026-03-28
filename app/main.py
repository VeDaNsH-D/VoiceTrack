import os

from fastapi import FastAPI
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes import process, stt
from app.routes import tts
from app.utils.config import TEMP_AUDIO_DIR
from app.utils.api_response import error_response
from app.utils.logger import logger

app = FastAPI()
os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv(
        "ALLOWED_ORIGINS", "*").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(str(exc.detail), {"code": "HTTP_ERROR"}),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled FastAPI exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content=error_response("Something went wrong", {
                               "code": "INTERNAL_SERVER_ERROR"}),
    )


@app.on_event("startup")
def on_startup():
    logger.info("FastAPI server started.")


app.include_router(stt.router)
app.include_router(process.router)
app.include_router(tts.router)
app.mount("/audio", StaticFiles(directory=TEMP_AUDIO_DIR), name="audio")
