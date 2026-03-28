from __future__ import annotations

from typing import Any, Dict, Optional

import requests

from app.utils.config import BACKEND_BASE_URL, BACKEND_CHAT_PATH
from app.utils.logger import logger


def _has_finalized_transaction(structured_data: Optional[Dict[str, Any]]) -> bool:
    if not isinstance(structured_data, dict):
        return False

    meta = structured_data.get("meta") or {}
    if meta.get("needs_clarification"):
        return False

    return bool((structured_data.get("sales") or []) or (structured_data.get("expenses") or []))


def _build_grounded_reply(transcript: str, structured_data: Optional[Dict[str, Any]]) -> str:
    sales = (structured_data or {}).get("sales") or []
    expenses = (structured_data or {}).get("expenses") or []
    hindi_like = any("\u0900" <= char <= "\u097F" for char in transcript) or any(
        token in transcript.lower() for token in ["aaj", "maine", "becha", "bechi", "rupaye", "chai", "kharcha"]
    )

    if sales:
        parts = []
        for sale in sales:
            qty = sale.get("qty")
            item = str(sale.get("item") or "item").strip()
            price = sale.get("price")
            if hindi_like:
                parts.append(f"{qty} {item} {price} rupaye ki")
            else:
                parts.append(f"{qty} {item} at {price} rupees each")
        joined = ", ".join(parts)
        return f"Theek hai, {joined} note kar li." if hindi_like else f"Okay, noted: {joined}."

    if expenses:
        parts = []
        for expense in expenses:
            item = str(expense.get("item") or "expense").strip()
            amount = expense.get("amount")
            if hindi_like:
                parts.append(f"{item} par {amount} rupaye")
            else:
                parts.append(f"{item} for {amount} rupees")
        joined = ", ".join(parts)
        return f"Theek hai, {joined} expense note kar liya." if hindi_like else f"Okay, noted expense: {joined}."

    return transcript.strip()


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

    if _has_finalized_transaction(structured_data):
        return _build_grounded_reply(cleaned_transcript, structured_data)

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
