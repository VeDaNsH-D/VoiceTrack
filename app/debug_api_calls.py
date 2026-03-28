#!/usr/bin/env python3
"""
Detailed debug script to identify why Groq/Gemini extraction is failing.
"""

import json
import requests
from app.utils.logger import logger
from app.utils.config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    OPENAI_API_KEY,
)
import sys
from pathlib import Path

app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir.parent))


HINDI_TEXT = "आज मेरे दो रुपये के दस समोसे बेचे।"


def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


print_section("DETAILED API TESTING")

# Test 1: Check Groq API directly
print("TEST 1: Groq API Direct Call")
print(f"API Key: {GROQ_API_KEY[:20]}..." if GROQ_API_KEY else "NOT SET")
print(f"Model: {GROQ_MODEL}\n")

if GROQ_API_KEY:
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "temperature": 0,
                "max_tokens": 200,
                "messages": [
                    {"role": "user", "content": "Say hello"}
                ],
            },
            timeout=10,
        )
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Response text: {response.text[:500]}")
        if response.ok:
            data = response.json()
            print(f"✓ Success! Response: {json.dumps(data, indent=2)[:500]}")
        else:
            print(f"✗ Error! Full response: {response.text}")
    except Exception as e:
        print(f"✗ Exception: {type(e).__name__}: {e}")

print("\n" + "="*70)
print("TEST 2: Gemini API Direct Call")
print(f"API Key: {GEMINI_API_KEY[:20]}..." if GEMINI_API_KEY else "NOT SET")
print(f"Model: {GEMINI_MODEL}\n")

if GEMINI_API_KEY:
    try:
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
                            {"text": "Say hello"}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0,
                    "maxOutputTokens": 200
                }
            },
            timeout=10,
        )
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Response text: {response.text[:500]}")
        if response.ok:
            data = response.json()
            print(f"✓ Success! Response: {json.dumps(data, indent=2)[:500]}")
        else:
            print(f"✗ Error! Full response: {response.text}")
    except Exception as e:
        print(f"✗ Exception: {type(e).__name__}: {e}")

print("\n" + "="*70)
print("TEST 3: Import and Call Functions Directly")
print("Importing functions...")

try:
    from app.services.llm_structurer import (
        _build_structurer_messages,
        _structure_with_groq,
        _structure_with_gemini,
    )
    print("✓ Imports successful")

    print(f"\nBuilding messages for: {HINDI_TEXT}")
    messages = _build_structurer_messages(HINDI_TEXT)
    print(f"Message 1 (system): {len(messages[0]['content'])} chars")
    print(f"Message 2 (user): {len(messages[1]['content'])} chars")
    print(f"\nFirst 200 chars of user message:")
    print(messages[1]['content'][:200])

    print("\n" + "-"*70)
    print("Calling _structure_with_groq directly...")
    result = _structure_with_groq(HINDI_TEXT)
    print(f"Result: {result}")

    print("\n" + "-"*70)
    print("Calling _structure_with_gemini directly...")
    result = _structure_with_gemini(HINDI_TEXT)
    print(f"Result: {result}")

except Exception as e:
    import traceback
    print(f"✗ Error: {e}")
    traceback.print_exc()
