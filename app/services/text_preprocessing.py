import re
from dataclasses import dataclass
from typing import Dict, List


HINDI_NUMBER_WORDS = {
    "ek": "1",
    "do": "2",
    "teen": "3",
    "char": "4",
    "chaar": "4",
    "paanch": "5",
    "chhe": "6",
    "che": "6",
    "saat": "7",
    "aath": "8",
    "nau": "9",
    "das": "10",
}

HINGLISH_ITEM_MAP = {
    "chai": "tea",
    "chaai": "tea",
    "samosa": "samosa",
    "doodh": "milk",
    "sabji": "vegetable",
    "sabzi": "vegetable",
    "tel": "oil",
    "atta": "flour",
}

FILLER_WORDS = {
    "umm",
    "uh",
    "haan",
    "han",
    "acha",
    "accha",
    "matlab",
    "like",
    "you know",
    "basically",
}


@dataclass
class PreprocessResult:
    raw_text: str
    normalized_text: str
    highlighted_numbers: List[str]
    applied_steps: List[str]

    def as_dict(self) -> Dict[str, object]:
        return {
            "raw_text": self.raw_text,
            "normalized_text": self.normalized_text,
            "highlighted_numbers": self.highlighted_numbers,
            "applied_steps": self.applied_steps,
        }


def _normalize_number_words(text: str) -> str:
    normalized = text
    for word, number in HINDI_NUMBER_WORDS.items():
        normalized = re.sub(rf"\b{re.escape(word)}\b", number, normalized, flags=re.IGNORECASE)
    return normalized


def _normalize_currency(text: str) -> str:
    normalized = re.sub(r"\b(rs\.?|rupees?|rupaye?)\b", " INR ", text, flags=re.IGNORECASE)
    normalized = normalized.replace("₹", " INR ")
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def _map_hinglish_items(text: str) -> str:
    normalized = text
    for source, target in HINGLISH_ITEM_MAP.items():
        normalized = re.sub(rf"\b{re.escape(source)}\b", target, normalized, flags=re.IGNORECASE)
    return normalized


def _remove_fillers(text: str) -> str:
    normalized = text
    for filler in sorted(FILLER_WORDS, key=len, reverse=True):
        normalized = re.sub(rf"\b{re.escape(filler)}\b", " ", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\s+", " ", normalized).strip(" ,.;")
    return normalized


def preprocess_transcript(text: str) -> Dict[str, object]:
    raw_text = str(text or "").strip()
    if not raw_text:
        return PreprocessResult(raw_text="", normalized_text="", highlighted_numbers=[], applied_steps=[]).as_dict()

    steps: List[str] = []
    normalized = raw_text

    normalized_numbers = _normalize_number_words(normalized)
    if normalized_numbers != normalized:
        steps.append("number_word_normalization")
    normalized = normalized_numbers

    normalized_currency = _normalize_currency(normalized)
    if normalized_currency != normalized:
        steps.append("currency_normalization")
    normalized = normalized_currency

    mapped_hinglish = _map_hinglish_items(normalized)
    if mapped_hinglish != normalized:
        steps.append("hinglish_mapping")
    normalized = mapped_hinglish

    filler_cleaned = _remove_fillers(normalized)
    if filler_cleaned != normalized:
        steps.append("filler_removal")
    normalized = filler_cleaned

    numbers = re.findall(r"\b\d+(?:\.\d+)?\b", normalized)
    return PreprocessResult(
        raw_text=raw_text,
        normalized_text=normalized,
        highlighted_numbers=numbers,
        applied_steps=steps,
    ).as_dict()
