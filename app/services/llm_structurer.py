import json
import re
from typing import Any, Dict, List, Optional

import requests

from app.utils.config import (
    BACKEND_BASE_URL,
    BACKEND_PROCESS_PATH,
    GROQ_API_KEY,
    GROQ_MODEL,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENAI_BASE_URL,
)
from app.utils.logger import logger


LOW_INFO_CLARIFICATION_HI = "ऑडियो स्पष्ट नहीं था। कृपया वस्तु, मात्रा और कीमत दोबारा स्पष्ट बताएं।"
LOW_INFO_CLARIFICATION_EN = "Audio was unclear. Please repeat the transaction with item, quantity, and amount."


def _contains_devanagari(text: str) -> bool:
    return bool(re.search(r"[\u0900-\u097F]", str(text or "")))


def _fallback_clarification_for_text(text: str) -> str:
    return LOW_INFO_CLARIFICATION_HI if _contains_devanagari(text) else LOW_INFO_CLARIFICATION_EN


def _is_low_signal_text(text: str) -> bool:
    cleaned = " ".join(str(text or "").strip().split())
    if not cleaned:
        return True

    words = cleaned.split()
    if len(words) <= 1:
        return True

    # If there is no digit and almost no informative tokens, treat as low-signal.
    has_digit = any(ch.isdigit() for ch in cleaned)
    informative_tokens = [w for w in words if len(w) > 2]
    if not has_digit and len(informative_tokens) <= 1:
        return True

    return False


def _looks_hallucinated(transcript: str, structured: Dict[str, Any]) -> bool:
    if not isinstance(structured, dict):
        return True

    sales = structured.get("sales") or []
    expenses = structured.get("expenses") or []
    if not sales and not expenses:
        return False

    transcript_text = str(transcript or "").lower()
    has_digit_in_transcript = any(ch.isdigit() for ch in transcript_text)
    has_transaction_hint = bool(re.search(
        r"\b(becha|बेचा|sold|sale|kharida|खरीदा|expense|spent|खर्च)\b",
        transcript_text,
        flags=re.IGNORECASE,
    ))

    # If extracted structured rows exist without any signal in transcript,
    # this is usually template/example leakage from the prompt.
    return not has_digit_in_transcript and not has_transaction_hint


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
    """
    IMPROVED: Better confidence computation and validation
    """
    sales = _normalize_sales(raw.get("sales"))
    expenses = _normalize_expenses(raw.get("expenses"))

    raw_meta = raw.get("meta") if isinstance(raw.get("meta"), dict) else {}
    needs_clarification = bool(raw_meta.get("needs_clarification"))
    clarification_question = str(raw_meta.get(
        "clarification_question") or "").strip()

    if needs_clarification and not clarification_question:
        clarification_question = "कृपया लेनदेन को स्पष्ट करें - वस्तु का नाम, मात्रा, और मूल्य बताएं।"

    if (sales or expenses) and not needs_clarification:
        clarification_question = None

    # IMPROVED: Confidence logic
    # If we have structured data (at least item + qty/amount), confidence should be HIGH
    has_complete_data = (
        all(s.get("item") and s.get("qty") and s.get("price") for s in sales) and
        all(e.get("item") and e.get("amount") for e in expenses)
    )

    if sales or expenses:
        if has_complete_data and not needs_clarification:
            confidence = 0.92
        elif has_complete_data:
            confidence = 0.85
        else:
            confidence = 0.75
    else:
        confidence = 0.45 if needs_clarification else 0.2

    logger.info(
        f"LLM output normalized: sales={len(sales)}, expenses={len(expenses)}, "
        f"needs_clarification={needs_clarification}, confidence={confidence}"
    )

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
    """
    IMPROVED: Enhanced system prompt with Hindi, Hinglish, and English examples
    Provides explicit guidance on:
    1. Hindi number conversion (दस = 10, चार = 4)
    2. Intent detection (sale vs expense)
    3. Multilingual input handling
    """
    system_prompt = (
        "You are a transaction extraction engine for Indian voice input (Hindi, Hinglish, English). "
        "Extract structured transaction data in JSON format. "
        "CRITICAL RULES:\n"
        "1. Return ONLY valid JSON (no explanations, no markdown code blocks)\n"
        "2. Convert Hindi numbers: दस=10, चार=4, पाँच=5, सात=7, बीस=20, सौ=100, आदि\n"
        "3. Detect transaction intent: sale/sold/बेचा = sales, expense/खरीदा/bought = expenses\n"
        "4. If transaction incomplete or ambiguous, set needs_clarification=true with a short, polite question in the SAME language\n"
        "5. Never hallucinate or invent values - extract ONLY what's explicitly stated\n"
        "6. qty, price, amount must be positive numbers\n"
        "7. Always validate: item names should be meaningful, prices > 0\n"
        "\n"
        "FORMAT (strict JSON):\n"
        '{"sales":[{"item":"string","qty":number,"price":number}],'
        '"expenses":[{"item":"string","amount":number}],'
        '"meta":{"needs_clarification":boolean,"clarification_question":string|null}}'
    )

    # IMPROVED: Multiple examples in different languages
    user_prompt = (
        "Extract transaction JSON from this text. Return ONLY valid JSON.\n\n"
        f"TEXT: {text.strip()}\n\n"
        "EXAMPLES:\n"
        '- Hindi: "आज मैंने दस रुपये के चार चिप्स बेचे।" → {"sales":[{"item":"chips","qty":4,"price":10}],"expenses":[],"meta":{"needs_clarification":false,"clarification_question":null}}\n'
        '- Hinglish: "maine 20 rupee ka chai becha" → {"sales":[{"item":"chai","qty":1,"price":20}],"expenses":[],"meta":{"needs_clarification":false,"clarification_question":null}}\n'
        '- Hindi: "मैंने 50 रुपये का दूध खरीदा" → {"sales":[],"expenses":[{"item":"milk","amount":50}],"meta":{"needs_clarification":false,"clarification_question":null}}\n'
        "\nNOW EXTRACT:"
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _structure_with_groq(text: str) -> Optional[Dict[str, Any]]:
    """Try Groq API (primary choice - fastest, multilingual)"""
    if not GROQ_API_KEY:
        logger.debug("Groq API key not configured")
        return None

    try:
        logger.debug(f"[GROQ] Attempting extraction, text_len={len(text)}")
        messages = _build_structurer_messages(text)

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "temperature": 0,
                "max_tokens": 1000,
                "messages": messages,
            },
            timeout=10,
        )

        if response.status_code >= 400:
            logger.warning(
                f"[GROQ] API error {response.status_code}: {response.text[:200]}")
            return None

        content = (
            (response.json() or {})
            .get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        logger.debug(f"[GROQ] Raw response: {content[:300]}")

        parsed = _extract_json_object(str(content or ""))
        if not parsed:
            logger.warning("[GROQ] Failed to extract JSON from response")
            return None

        normalized = _normalize_structured_output(parsed)
        logger.info(
            f"[GROQ] ✓ Success: sales={len(normalized.get('sales'))}, expenses={len(normalized.get('expenses'))}")
        return normalized
    except Exception as exc:
        logger.warning(f"[GROQ] Extraction failed: {exc}")
        return None


def _structure_with_gemini(text: str) -> Optional[Dict[str, Any]]:
    """Try Gemini API (backup - reliable)"""
    if not GEMINI_API_KEY:
        logger.debug("Gemini API key not configured")
        return None

    try:
        logger.debug(f"[GEMINI] Attempting extraction, text_len={len(text)}")
        messages = _build_structurer_messages(text)

        # Combine system and user messages for Gemini API
        full_prompt = f"{messages[0]['content']}\n\n{messages[1]['content']}"

        response = requests.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },
            json={
                "contents": [
                    {
                        "parts": [
                            {"text": full_prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0,
                    "maxOutputTokens": 1000
                }
            },
            timeout=10,
        )

        if response.status_code >= 400:
            logger.warning(
                f"[GEMINI] API error {response.status_code}: {response.text[:200]}")
            return None

        content = (
            (response.json() or {})
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        logger.debug(f"[GEMINI] Raw response: {content[:300]}")

        parsed = _extract_json_object(str(content or ""))
        if not parsed:
            logger.warning("[GEMINI] Failed to extract JSON from response")
            return None

        normalized = _normalize_structured_output(parsed)
        logger.info(
            f"[GEMINI] ✓ Success: sales={len(normalized.get('sales'))}, expenses={len(normalized.get('expenses'))}")
        return normalized
    except Exception as exc:
        logger.warning(f"[GEMINI] Extraction failed: {exc}")
        return None


def _structure_with_openai(text: str) -> Optional[Dict[str, Any]]:
    """Try OpenAI API (fallback)"""
    if not OPENAI_API_KEY:
        logger.debug("OpenAI API key not configured")
        return None

    try:
        logger.debug(f"[OPENAI] Attempting extraction, text_len={len(text)}")
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
                "max_tokens": 1000,
                "messages": _build_structurer_messages(text),
                "response_format": {"type": "json_object"},
            },
            timeout=10,
        )

        if response.status_code >= 400:
            logger.warning(
                f"[OPENAI] API error {response.status_code}: {response.text[:200]}")
            return None

        content = (
            (response.json() or {})
            .get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        logger.debug(f"[OPENAI] Raw response: {content[:300]}")

        parsed = _extract_json_object(str(content or ""))
        if not parsed:
            logger.warning("[OPENAI] Failed to extract JSON from response")
            return None

        normalized = _normalize_structured_output(parsed)
        logger.info(
            f"[OPENAI] ✓ Success: sales={len(normalized.get('sales'))}, expenses={len(normalized.get('expenses'))}")
        return normalized
    except Exception as exc:
        logger.warning(f"[OPENAI] Extraction failed: {exc}")
        return None


def _structure_with_llm(text: str) -> Optional[Dict[str, Any]]:
    """Try LLM extraction with model priority: Groq → Gemini → OpenAI"""
    logger.debug("[LLM] Starting model priority chain")

    # Step 1: Try Groq (fast, multilingual)
    result = _structure_with_groq(text)
    if result is not None:
        return result

    # Step 2: Try Gemini (backup, reliable)
    result = _structure_with_gemini(text)
    if result is not None:
        return result

    # Step 3: Try OpenAI (fallback)
    result = _structure_with_openai(text)
    if result is not None:
        return result

    logger.error("[LLM] All LLM providers failed or not configured")
    return None


def _structure_with_backend(cleaned_text: str, user_id: Optional[str]) -> Dict[str, Any]:
    backend_url = f"{BACKEND_BASE_URL.rstrip('/')}{BACKEND_PROCESS_PATH}"
    logger.info("Forwarding transcript to backend processor: %s", backend_url)

    payload = {"text": cleaned_text, "save": False}
    if user_id and user_id.strip():
        payload["userId"] = user_id.strip()

    response = requests.post(backend_url, json=payload, timeout=60)

    if response.status_code >= 400:
        logger.error("Backend processing failed (%s): %s",
                     response.status_code, response.text)
        raise RuntimeError(
            f"Backend processing failed with status {response.status_code}")

    return response.json()


def structure_transcript(text: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    LLM-first transcript structuring with backend fallback.
    IMPROVED: Added comprehensive debug logging and better error handling
    """
    cleaned_text = text.strip()
    if not cleaned_text:
        logger.error("Empty text provided for structuring")
        raise ValueError("Text is required for processing.")

    if _is_low_signal_text(cleaned_text):
        logger.warning(
            "[PIPELINE] Low-signal transcript detected; skipping extraction")
        return {
            "sales": [],
            "expenses": [],
            "meta": {
                "confidence": 0.2,
                "source": "llm",
                "needs_clarification": True,
                "clarification_question": _fallback_clarification_for_text(cleaned_text),
            },
        }

    logger.info(
        f"[PIPELINE] Starting extraction for user_id={user_id}, text_len={len(cleaned_text)}")

    # Step 1: Try LLM extraction
    llm_result = _structure_with_llm(cleaned_text)
    if llm_result is not None:
        if _looks_hallucinated(cleaned_text, llm_result):
            logger.warning(
                "[PIPELINE] Potential hallucinated extraction blocked")
            return {
                "sales": [],
                "expenses": [],
                "meta": {
                    "confidence": 0.2,
                    "source": "llm",
                    "needs_clarification": True,
                    "clarification_question": _fallback_clarification_for_text(cleaned_text),
                },
            }

        logger.info(
            f"[PIPELINE] ✓ LLM extraction succeeded: "
            f"sales={len(llm_result.get('sales'))}, "
            f"expenses={len(llm_result.get('expenses'))}, "
            f"confidence={llm_result.get('meta', {}).get('confidence')}"
        )
        return llm_result

    # Step 2: Fallback to backend extraction
    logger.warning(
        "[PIPELINE] ✗ LLM extraction failed or unavailable; "
        "using backend extraction fallback"
    )
    backend_result = _structure_with_backend(cleaned_text, user_id)
    if _looks_hallucinated(cleaned_text, backend_result):
        logger.warning(
            "[PIPELINE] Potential hallucinated backend extraction blocked")
        return {
            "sales": [],
            "expenses": [],
            "meta": {
                "confidence": 0.2,
                "source": "llm",
                "needs_clarification": True,
                "clarification_question": _fallback_clarification_for_text(cleaned_text),
            },
        }
    return backend_result
