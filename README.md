# VoiceTrack ML Service

## Setup

1. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Run the server:

   ```bash
   uvicorn app.main:app --reload
   ```

## Endpoints

- `GET /health` — Health check
- `POST /stt` — Speech-to-text (audio upload)
- `POST /process` — Placeholder for text processing

## Folder Structure

- `app/`
  - `main.py` — FastAPI app entrypoint
  - `routes/` — API route handlers
  - `services/` — ML and business logic
  - `utils/` — Utilities (logging, etc.)
  - `temp_audio/` — Temporary audio file storage