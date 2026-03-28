#!/usr/bin/env python3
"""
Comprehensive debug script for transaction extraction pipeline.
Tests Python LLM extraction, Groq/Gemini/OpenAI fallback, and backend fallback.
"""

from app.utils.logger import logger
from app.utils.config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    BACKEND_BASE_URL,
    BACKEND_PROCESS_PATH,
)
from app.services.llm_structurer import (
    structure_transcript,
    _structure_with_groq,
    _structure_with_gemini,
    _structure_with_openai,
    _structure_with_backend,
    _build_structurer_messages,
)
import json
import sys
import os
from pathlib import Path

# Add app to path
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir.parent))


# Test input
HINDI_TEXT = "आज मेरे दो रुपये के दस समोसे बेचे।"  # Sold 10 samosas for ₹2 each


def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


def check_env_vars():
    """Check if all API keys are configured"""
    print_section("ENVIRONMENT & API KEY CHECK")

    checks = [
        ("GROQ_API_KEY", GROQ_API_KEY, GROQ_MODEL),
        ("GEMINI_API_KEY", GEMINI_API_KEY, GEMINI_MODEL),
        ("OPENAI_API_KEY", OPENAI_API_KEY, OPENAI_MODEL),
    ]

    print(f"Backend URL: {BACKEND_BASE_URL}{BACKEND_PROCESS_PATH}\n")

    for name, key, model in checks:
        if key:
            masked = f"{key[:10]}..." if len(key) > 10 else "***"
            print(f"✓ {name}: {masked}")
            print(f"  Model: {model}")
        else:
            print(f"✗ {name}: NOT CONFIGURED")

    available = sum(1 for _, k, _ in checks if k)
    print(f"\nAvailable providers: {available}/3")


def test_groq():
    """Test Groq extraction directly"""
    print_section("TESTING GROQ EXTRACTION")

    if not GROQ_API_KEY:
        print("✗ GROQ_API_KEY not configured, skipping")
        return False

    try:
        print(f"Input: {HINDI_TEXT}")
        print(f"Model: {GROQ_MODEL}\n")

        result = _structure_with_groq(HINDI_TEXT)

        if result:
            print("✓ GROQ Extraction succeeded!")
            print(
                f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
            return True
        else:
            print("✗ GROQ returned None")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_gemini():
    """Test Gemini extraction directly"""
    print_section("TESTING GEMINI EXTRACTION")

    if not GEMINI_API_KEY:
        print("✗ GEMINI_API_KEY not configured, skipping")
        return False

    try:
        print(f"Input: {HINDI_TEXT}")
        print(f"Model: {GEMINI_MODEL}\n")

        result = _structure_with_gemini(HINDI_TEXT)

        if result:
            print("✓ GEMINI Extraction succeeded!")
            print(
                f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
            return True
        else:
            print("✗ GEMINI returned None")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_openai():
    """Test OpenAI extraction directly"""
    print_section("TESTING OPENAI EXTRACTION")

    if not OPENAI_API_KEY:
        print("✗ OPENAI_API_KEY not configured, skipping")
        return False

    try:
        print(f"Input: {HINDI_TEXT}")
        print(f"Model: {OPENAI_MODEL}\n")

        result = _structure_with_openai(HINDI_TEXT)

        if result:
            print("✓ OPENAI Extraction succeeded!")
            print(
                f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
            return True
        else:
            print("✗ OPENAI returned None")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_backend():
    """Test backend extraction directly"""
    print_section("TESTING BACKEND EXTRACTION")

    try:
        print(f"Input: {HINDI_TEXT}")
        print(f"Backend URL: {BACKEND_BASE_URL}{BACKEND_PROCESS_PATH}\n")

        result = _structure_with_backend(HINDI_TEXT, None)

        if result:
            print("✓ Backend extraction succeeded!")
            print(
                f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
            return True
        else:
            print("✗ Backend returned None/empty")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_full_pipeline():
    """Test the full extraction pipeline"""
    print_section("TESTING FULL EXTRACTION PIPELINE")

    try:
        print(f"Input: {HINDI_TEXT}\n")

        result = structure_transcript(HINDI_TEXT)

        print("✓ Full pipeline completed!")
        print(f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")

        # Check if any transactions were extracted
        sales = result.get('sales', [])
        expenses = result.get('expenses', [])

        print(f"\nExtraction Summary:")
        print(f"  Sales: {len(sales)}")
        print(f"  Expenses: {len(expenses)}")
        print(f"  Confidence: {result.get('meta', {}).get('confidence', 0)}")
        print(
            f"  Needs Clarification: {result.get('meta', {}).get('needs_clarification', False)}")

        return len(sales) > 0 or len(expenses) > 0
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n" + "="*70)
    print("  TRANSACTION EXTRACTION PIPELINE DEBUG TOOL")
    print("="*70)
    print(f"  Test Input: {HINDI_TEXT}")
    print("="*70)

    # 1. Check environment
    check_env_vars()

    # 2. Test individual providers
    groq_ok = test_groq()
    gemini_ok = test_gemini()
    openai_ok = test_openai()

    # 3. Test backend
    backend_ok = test_backend()

    # 4. Test full pipeline
    pipeline_ok = test_full_pipeline()

    # Summary
    print_section("DEBUG SUMMARY")

    print("Individual Provider Results:")
    print(f"  Groq:    {'✓ PASS' if groq_ok else '✗ FAIL'}")
    print(f"  Gemini:  {'✓ PASS' if gemini_ok else '✗ FAIL'}")
    print(f"  OpenAI:  {'✓ PASS' if openai_ok else '✗ FAIL'}")
    print(f"  Backend: {'✓ PASS' if backend_ok else '✗ FAIL'}")
    print(f"\nFull Pipeline: {'✓ PASS' if pipeline_ok else '✗ FAIL'}")

    if not pipeline_ok:
        print("\n⚠️  ISSUES FOUND:")
        if not groq_ok and not gemini_ok and not openai_ok:
            print("  → No LLM providers working. Check API keys!")
        if not backend_ok:
            print(
                "  → Backend is not responding. Check if Node.js server is running on port 5001")


if __name__ == "__main__":
    main()
