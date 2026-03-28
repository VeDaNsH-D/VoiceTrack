import re
from typing import Dict, List
from app.utils.logger import logger

def evaluate_transcript(text: str) -> Dict:
    logger.info("Evaluating transcript: %s", text)

    content = str(text or "").strip()
    issues: List[str] = []

    has_numbers = bool(re.search(r"\b\d+(?:\.\d+)?\b", content))
    has_keywords = bool(
        re.search(
            r"\b(chai|tea|samosa|milk|doodh|expense|kharcha|rent|diesel|petrol|sale|becha|bikri)\b",
            content,
            flags=re.IGNORECASE,
        )
    )
    has_structure = bool(
        re.search(r"\b\d+\s+[a-zA-Z\u0900-\u097F]+\s+\d+\b", content)
        or re.search(r"\b[a-zA-Z\u0900-\u097F]+\s+\d+\b", content)
    )

    words = re.findall(r"[\w\u0900-\u097F]+", content)
    sentence_completeness = len(words) >= 4 and (has_numbers or has_keywords)

    if not has_numbers:
        issues.append("No numbers present")
    if not has_structure:
        issues.append("Structure pattern missing")
    if not has_keywords:
        issues.append("Domain keywords missing")
    if not sentence_completeness:
        issues.append("Sentence appears incomplete")

    component_scores = {
        "numbers": 1.0 if has_numbers else 0.0,
        "structure": 1.0 if has_structure else 0.0,
        "keywords": 1.0 if has_keywords else 0.0,
        "sentence_completeness": 1.0 if sentence_completeness else 0.0,
    }
    score = round(
        (
            component_scores["numbers"] * 0.35
            + component_scores["structure"] * 0.25
            + component_scores["keywords"] * 0.2
            + component_scores["sentence_completeness"] * 0.2
        ),
        3,
    )
    is_valid = score >= 0.7

    return {
        "is_valid": is_valid,
        "score": score,
        "issues": issues,
        "checks": {
            "numbers_present": has_numbers,
            "structure_valid": has_structure,
            "keywords_present": has_keywords,
            "sentence_complete": sentence_completeness,
        },
        "component_scores": component_scores,
    }
