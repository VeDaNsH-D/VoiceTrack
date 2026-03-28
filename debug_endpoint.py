#!/usr/bin/env python3
"""
Debug the transaction endpoint response
"""

import requests
import json

print("\n" + "="*70)
print("  TRANSACTION ENDPOINT DEBUG TEST")
print("="*70 + "\n")

BACKEND_URL = "http://127.0.0.1:5001"
TRANSACTION_ENDPOINT = f"{BACKEND_URL}/api/transactions/process-text"

text = "आज मेरे दो रुपये के दस समोसे बेचे।"

print(f"Request: POST {TRANSACTION_ENDPOINT}")
print(f"Body: {{'text': '{text}', 'save': False}}\n")

response = requests.post(
    TRANSACTION_ENDPOINT,
    json={"text": text, "save": False},
    timeout=30,
)

print(f"Status: {response.status_code}\n")
print(f"Headers: {dict(response.headers)}\n")
print(f"Full Response:")
print(json.dumps(response.json(), indent=2, ensure_ascii=False))
