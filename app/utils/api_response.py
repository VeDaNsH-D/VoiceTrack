from typing import Any, Dict, Optional


def success_response(data: Any, message: str = "OK") -> Dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "message": message,
    }


def error_response(message: str, error: Optional[Any] = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "success": False,
        "message": message,
    }
    if error is not None:
        payload["error"] = error
    return payload
