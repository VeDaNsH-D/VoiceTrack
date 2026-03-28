from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Tuple

import requests

from app.utils.config import BACKEND_BASE_URL, BACKEND_CHAT_PATH, OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
from app.utils.logger import logger


def _has_finalized_transaction(structured_data: Optional[Dict[str, Any]]) -> bool:
    if not isinstance(structured_data, dict):
        return False

    meta = structured_data.get("meta") or {}
    if meta.get("needs_clarification"):
        return False

    return bool((structured_data.get("sales") or []) or (structured_data.get("expenses") or []))


def _detect_language_style(transcript: str) -> str:
    text = str(transcript or "")
    lowered = text.lower()

    if any("\u0900" <= char <= "\u097F" for char in text):
        return "hindi"

    hinglish_markers = [
        "aaj",
        "maine",
        "becha",
        "bechi",
        "kitna",
        "kitni",
        "rupaye",
        "chai",
        "kharcha",
        "theek",
    ]
    if any(marker in lowered for marker in hinglish_markers):
        return "hinglish"

    return "english"


def _safe_number(value: Any) -> str:
    if isinstance(value, bool):
        return "0"
    if isinstance(value, (int, float)):
        return str(int(value) if float(value).is_integer() else round(float(value), 2))
    cleaned = "".join(ch for ch in str(value or "") if ch.isdigit() or ch == ".")
    return cleaned or "0"


def _collect_missing_fields(structured_data: Optional[Dict[str, Any]]) -> List[str]:
    missing: List[str] = []
    if not isinstance(structured_data, dict):
        return ["transaction_details"]

    sales = structured_data.get("sales") or []
    expenses = structured_data.get("expenses") or []

    if not sales and not expenses:
        missing.append("transaction_type")

    for index, sale in enumerate(sales, start=1):
        if not str(sale.get("item") or "").strip():
            missing.append(f"sale_{index}_item")
        if float(_safe_number(sale.get("qty"))) <= 0:
            missing.append(f"sale_{index}_qty")
        if float(_safe_number(sale.get("price"))) <= 0:
            missing.append(f"sale_{index}_price")

    for index, expense in enumerate(expenses, start=1):
        if not str(expense.get("item") or "").strip():
            missing.append(f"expense_{index}_item")
        if float(_safe_number(expense.get("amount"))) <= 0:
            missing.append(f"expense_{index}_amount")

    return missing


def _build_specific_clarification_question(transcript: str, structured_data: Optional[Dict[str, Any]]) -> str:
    style = _detect_language_style(transcript)
    missing = _collect_missing_fields(structured_data)

    if not missing:
        if style in {"hindi", "hinglish"}:
            return "Kripya item, quantity aur amount ek baar confirm kar dijiye."
        return "Please confirm item, quantity, and amount once."

    if "transaction_type" in missing:
        if style in {"hindi", "hinglish"}:
            return "Yeh sale hai ya expense? Kripya item, quantity aur amount batayiye."
        return "Is this a sale or an expense? Please share item, quantity, and amount."

    if any(token.endswith("_qty") for token in missing):
        if style in {"hindi", "hinglish"}:
            return "Quantity clear nahi hai. Kitni quantity thi?"
        return "The quantity is unclear. What was the quantity?"

    if any(token.endswith("_price") or token.endswith("_amount") for token in missing):
        if style in {"hindi", "hinglish"}:
            return "Amount clear nahi hai. Kitna amount tha?"
        return "The amount is unclear. What was the amount?"

    if style in {"hindi", "hinglish"}:
        return "Kripya transaction thoda clearly batayiye: item, quantity, amount."
    return "Please restate the transaction clearly with item, quantity, and amount."


def _build_grounded_reply(transcript: str, structured_data: Optional[Dict[str, Any]]) -> str:
    sales = (structured_data or {}).get("sales") or []
    expenses = (structured_data or {}).get("expenses") or []
    style = _detect_language_style(transcript)

    if sales:
        parts = []
        total_sales = 0.0
        for sale in sales:
            qty = _safe_number(sale.get("qty"))
            item = str(sale.get("item") or "item").strip()
            price = _safe_number(sale.get("price"))
            try:
                total_sales += float(qty) * float(price)
            except ValueError:
                pass

            if style in {"hindi", "hinglish"}:
                parts.append(f"{qty} {item} {price} rupaye")
            else:
                parts.append(f"{qty} {item} at {price} rupees")

        joined = ", ".join(parts)
        if style == "hindi":
            return f"ठीक है, मैंने नोट किया: {joined}. कुल बिक्री लगभग {_safe_number(total_sales)} रुपये।"
        if style == "hinglish":
            return f"Theek hai, maine note kiya: {joined}. Total sale approx {_safe_number(total_sales)} rupaye."
        return f"Okay, noted: {joined}. Total sales are about {_safe_number(total_sales)} rupees."

    if expenses:
        parts = []
        total_expense = 0.0
        for expense in expenses:
            item = str(expense.get("item") or "expense").strip()
            amount = _safe_number(expense.get("amount"))
            try:
                total_expense += float(amount)
            except ValueError:
                pass
            if style in {"hindi", "hinglish"}:
                parts.append(f"{item} par {amount} rupaye")
            else:
                parts.append(f"{item} for {amount} rupees")

        joined = ", ".join(parts)
        if style == "hindi":
            return f"ठीक है, खर्च नोट कर लिया: {joined}. कुल खर्च {_safe_number(total_expense)} रुपये।"
        if style == "hinglish":
            return f"Theek hai, expense note kar liya: {joined}. Total expense {_safe_number(total_expense)} rupaye."
        return f"Okay, noted expense: {joined}. Total expense is {_safe_number(total_expense)} rupees."

    return transcript.strip()


def _build_llm_payload(transcript: str, structured_data: Optional[Dict[str, Any]]) -> Tuple[str, str]:
    style = _detect_language_style(transcript)
    style_instruction = {
        "hindi": "Hindi",
        "hinglish": "Hinglish",
        "english": "English",
    }.get(style, "Hinglish")

    system_prompt = (
        "You are a voice transaction assistant for small business owners in India. "
        "You must produce short, natural, speech-friendly replies that are warm and professional. "
        "Never invent numeric values. Use only the provided structured fields."
    )

    user_prompt = (
        f"Language style: {style_instruction}\n"
        f"Original transcript: {transcript.strip()}\n"
        f"Structured transaction JSON: {json.dumps(structured_data or {}, ensure_ascii=False)}\n"
        "Task:\n"
        "1) If needs_clarification=true, ask one precise follow-up question.\n"
        "2) If transaction is complete, acknowledge with item/qty/amount summary.\n"
        "3) Keep response under 28 words.\n"
        "4) Speak naturally like a real assistant, not robotic.\n"
        "Return only final reply text."
    )
    return system_prompt, user_prompt


def _generate_openai_grounded_reply(transcript: str, structured_data: Optional[Dict[str, Any]]) -> Optional[str]:
    if not OPENAI_API_KEY:
        return None

    system_prompt, user_prompt = _build_llm_payload(transcript, structured_data)
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": OPENAI_MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        base_url = OPENAI_BASE_URL.rstrip("/")
        response = requests.post(f"{base_url}/chat/completions", headers=headers, json=body, timeout=12)
        if response.status_code >= 400:
            logger.warning("OpenAI grounded reply failed (%s): %s", response.status_code, response.text)
            return None

        content = (
            (response.json() or {})
            .get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        reply = str(content or "").strip()
        return reply or None
    except Exception as exc:
        logger.warning("OpenAI grounded reply unavailable: %s", exc)
        return None


def _build_llm_message(transcript: str, structured_data: Optional[Dict[str, Any]]) -> str:
    sales = (structured_data or {}).get("sales") or []
    expenses = (structured_data or {}).get("expenses") or []
    meta = (structured_data or {}).get("meta") or {}

    formatted_sales = [
        f"- item={sale.get('item')}, qty={sale.get('qty')}, price_per_unit={sale.get('price')}"
        for sale in sales
    ]
    formatted_expenses = [
        f"- item={expense.get('item')}, amount={expense.get('amount')}"
        for expense in expenses
    ]

    lines = [
        "The following message came from a voice-recorded business transaction.",
        f"Original transcript: {transcript.strip()}",
        "Use the parsed transaction data as the source of truth whenever it is available.",
        "Do not swap quantity and price.",
        "Do not invent or normalize numbers beyond the parsed fields.",
    ]

    if formatted_sales:
        lines.append("Parsed sales:")
        lines.extend(formatted_sales)
    if formatted_expenses:
        lines.append("Parsed expenses:")
        lines.extend(formatted_expenses)

    if meta.get("needs_clarification"):
        question = str(meta.get("clarification_question") or "").strip()
        lines.append("A clarification is still needed.")
        if question:
            lines.append(f"Ask this follow-up naturally: {question}")
    else:
        lines.append("The transaction appears complete.")
        lines.append("Reply with a short natural acknowledgment confirming exactly what was understood from the parsed fields.")
        lines.append("For sales, mention the quantity first and the per-unit price second only if needed.")
        lines.append('Example style: "Theek hai, 2 chai 4 rupaye ki note kar li."')

    lines.append("Reply in the same language as the user. Keep it concise and voice-friendly.")
    return "\n".join(lines)


def _build_clarification_reply(transcript: str, structured_data: Optional[Dict[str, Any]]) -> str:
    meta = (structured_data or {}).get("meta") or {}
    question = str(meta.get("clarification_question") or "").strip()

    if question:
        return question

    llm_reply = _generate_openai_grounded_reply(transcript, structured_data)
    if llm_reply:
        return llm_reply

    return _build_specific_clarification_question(transcript, structured_data)


def generate_assistant_reply(
    user_id: str,
    transcript: str,
    structured_data: Optional[Dict[str, Any]] = None,
    stt_provider: str = "sarvam",
) -> str:
    cleaned_user_id = str(user_id or "").strip()
    cleaned_transcript = str(transcript or "").strip()

    if not cleaned_user_id:
        raise ValueError("user_id is required for assistant reply generation.")
    if not cleaned_transcript:
        raise ValueError("transcript is required for assistant reply generation.")

    if isinstance(structured_data, dict):
        meta = structured_data.get("meta") or {}
        if meta.get("needs_clarification"):
            return _build_clarification_reply(cleaned_transcript, structured_data)

    if _has_finalized_transaction(structured_data):
        llm_reply = _generate_openai_grounded_reply(cleaned_transcript, structured_data)
        if llm_reply:
            return llm_reply
        return _build_grounded_reply(cleaned_transcript, structured_data)

    # Last fallback: only query backend chat when parsed transaction data is unavailable.
    backend_url = f"{BACKEND_BASE_URL.rstrip('/')}{BACKEND_CHAT_PATH}"
    payload = {
        "userId": cleaned_user_id,
        "message": _build_llm_message(cleaned_transcript, structured_data),
        "source": "voice",
        "sttProvider": stt_provider,
    }

    logger.info("Forwarding conversation reply generation to backend chat: %s", backend_url)
    response = requests.post(backend_url, json=payload, timeout=60)

    if response.status_code >= 400:
        logger.error("Backend chat failed (%s): %s", response.status_code, response.text)
        raise RuntimeError(f"Backend chat failed with status {response.status_code}")

    reply = (response.json() or {}).get("reply")
    if not isinstance(reply, str) or not reply.strip():
        raise RuntimeError("Backend chat returned an empty reply")

    return reply.strip()
