import json
import re
from typing import Any, Dict, List, Optional

import requests

from app.utils.config import (
    BACKEND_BASE_URL,
    BACKEND_PROCESS_PATH,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENAI_MODEL,
)
from app.utils.logger import logger


def _extract_json_object(content: str) -> Dict[str, Any]:
    text = str(content or "").strip()
    if not text:
        return {}

    cleaned = text
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.replace("json", "", 1).strip()

    if not cleaned.startswith("{"):
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            cleaned = match.group(0)

    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _to_positive_number(value: Any) -> float:
    if isinstance(value, bool):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value) if float(value) > 0 else 0.0

    text = str(value or "")
    digits = "".join(ch for ch in text if ch.isdigit() or ch == ".")
    if not digits:
        return 0.0

    try:
        parsed = float(digits)
        return parsed if parsed > 0 else 0.0
    except ValueError:
        return 0.0


def _normalize_sales(sales: Any) -> List[Dict[str, Any]]:
    if not isinstance(sales, list):
        return []

    normalized: List[Dict[str, Any]] = []
    for sale in sales:
        if not isinstance(sale, dict):
            continue
        item = str(sale.get("item") or "").strip().lower()
        qty = _to_positive_number(sale.get("qty"))
        price = _to_positive_number(sale.get("price"))
        if not item or qty <= 0 or price <= 0:
            continue
        normalized.append({
            "item": item,
            "qty": int(qty) if qty.is_integer() else round(qty, 2),
            "price": int(price) if price.is_integer() else round(price, 2),
        })
    return normalized


def _normalize_expenses(expenses: Any) -> List[Dict[str, Any]]:
    if not isinstance(expenses, list):
        return []

    normalized: List[Dict[str, Any]] = []
    for expense in expenses:
        if not isinstance(expense, dict):
            continue
        item = str(expense.get("item") or "").strip().lower()
        amount = _to_positive_number(expense.get("amount"))
        if not item or amount <= 0:
            continue
        normalized.append({
            "item": item,
            "amount": int(amount) if amount.is_integer() else round(amount, 2),
        })
    return normalized


def _normalize_structured_output(raw: Dict[str, Any]) -> Dict[str, Any]:
    sales = _normalize_sales(raw.get("sales"))
    expenses = _normalize_expenses(raw.get("expenses"))

    raw_meta = raw.get("meta") if isinstance(raw.get("meta"), dict) else {}
    needs_clarification = bool(raw_meta.get("needs_clarification"))
    clarification_question = str(raw_meta.get("clarification_question") or "").strip()

    if needs_clarification and not clarification_question:
        clarification_question = "Kripya transaction ko item, quantity aur amount ke saath confirm kariye."

    if (sales or expenses) and not needs_clarification:
        clarification_question = None

    confidence = 0.88 if (sales or expenses) and not needs_clarification else 0.45

    return {
        "sales": sales,
        "expenses": expenses,
        "meta": {
            "confidence": confidence,
            "source": "llm",
            "needs_clarification": needs_clarification,
            "clarification_question": clarification_question,
        },
    }


def _build_structurer_messages(text: str) -> List[Dict[str, str]]:
    system_prompt = (
        "You are a transaction extraction engine for Indian voice input. "
        "Return ONLY valid JSON with this exact shape: "
        "{\"sales\":[{\"item\":\"string\",\"qty\":number,\"price\":number}],"
        "\"expenses\":[{\"item\":\"string\",\"amount\":number}],"
        "\"meta\":{\"needs_clarification\":boolean,\"clarification_question\":string|null}}. "
        "If transaction is incomplete or ambiguous, set needs_clarification=true and provide exactly one short clarification question in user language. "
        "Never hallucinate numbers."
    )

    user_prompt = (
        "Extract transaction JSON from the following text.\n"
        f"Input: {text.strip()}\n"
        "Rules:\n"
        "1) Keep sales and expenses separate.\n"
        "2) qty, price, amount must be numeric and > 0 when present.\n"
        "3) If unclear, do not guess; ask clarification in meta.clarification_question.\n"
        "4) Return only JSON."
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _structure_with_llm(text: str) -> Optional[Dict[str, Any]]:
    if not OPENAI_API_KEY:
        return None

    try:
        base_url = OPENAI_BASE_URL.rstrip("/")
        response = requests.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_MODEL,
                "temperature": 0,
                "messages": _build_structurer_messages(text),
                "response_format": {"type": "json_object"},
            },
            timeout=18,
        )

        if response.status_code >= 400:
            logger.warning("LLM structurer failed (%s): %s", response.status_code, response.text)
            return None

        content = (
            (response.json() or {})
            .get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        parsed = _extract_json_object(str(content or ""))
        if not parsed:
            logger.warning("LLM structurer returned non-JSON content")
            return None

        normalized = _normalize_structured_output(parsed)
        return normalized
    except Exception as exc:
        logger.warning("LLM structurer unavailable: %s", exc)
        return None


def _structure_with_backend(cleaned_text: str, user_id: Optional[str]) -> Dict[str, Any]:
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


def structure_transcript(text: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    """LLM-first transcript structuring with backend fallback."""
    cleaned_text = text.strip()
    if not cleaned_text:
        raise ValueError("Text is required for processing.")

    llm_result = _structure_with_llm(cleaned_text)
    if llm_result is not None:
        logger.info("Transcript structured via LLM-first path")
        return llm_result

    logger.info("LLM structurer unavailable; using backend extraction fallback")
    return _structure_with_backend(cleaned_text, user_id)
