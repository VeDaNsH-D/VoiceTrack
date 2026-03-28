from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class ProcessRequest(BaseModel):
    text: str

@router.post("/process")
def process_text(request: ProcessRequest):
    """Mock processing endpoint."""
    if not request.text:
        raise HTTPException(status_code=400, detail="Text is required.")
    # Placeholder for future processing logic
    return {"structured": True, "entities": [], "original": request.text}
