#!/usr/bin/env python3
"""Test Gemini API with different endpoints"""

import requests
import json

GEMINI_API_KEY = "AIzaSyCMYeamYi6M9LNEByqA-jJwx3e7nJfL7B4"
MODEL = "gemini-2.5-flash"

print("Testing Gemini API Endpoints\n")

# Test 1: v1beta/models/...
print("=" * 70)
print("TEST 1: v1beta/models/.../generateContent (Current)")
print("=" * 70)
url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
print(f"URL: {url}\n")

response = requests.post(
    url,
    headers={
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
    },
    json={
        "contents": [{
            "parts": [{"text": "Say hello"}]
        }]
    },
    timeout=10,
)
print(f"Status: {response.status_code}")
print(f"Response: {response.text[:500]}\n")

# Test 2: v1/models/...
print("=" * 70)
print("TEST 2: v1/models/.../generateContent")
print("=" * 70)
url = f"https://generativelanguage.googleapis.com/v1/models/{MODEL}:generateContent"
print(f"URL: {url}\n")

response = requests.post(
    url,
    headers={
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
    },
    json={
        "contents": [{
            "parts": [{"text": "Say hello"}]
        }]
    },
    timeout=10,
)
print(f"Status: {response.status_code}")
print(f"Response: {response.text[:500]}\n")

# Test 3: Check available models
print("=" * 70)
print("TEST 3: List available models")
print("=" * 70)
url = "https://generativelanguage.googleapis.com/v1/models"
print(f"URL: {url}\n")

response = requests.get(
    url,
    headers={
        "x-goog-api-key": GEMINI_API_KEY
    },
    timeout=10,
)
print(f"Status: {response.status_code}")
data = response.json()
if "models" in data:
    print(f"Available models ({len(data['models'])} total):")
    for model in data["models"][:5]:
        print(f"  - {model.get('name', 'unknown')}")
else:
    print(f"Response: {json.dumps(data, indent=2)[:500]}")
