#!/usr/bin/env python3
"""
Test the Node.js backend transaction endpoint with extraction.
"""

import requests
import json
import time
import sys

print("\n" + "="*70)
print("  NODE.JS BACKEND INTEGRATION TEST")
print("="*70 + "\n")

BACKEND_URL = "http://127.0.0.1:5001"
TRANSACTION_ENDPOINT = f"{BACKEND_URL}/api/transactions/process-text"

# Test 1: Check if backend is running
print("Test 1: Checking if Node.js backend is running...")
print(f"URL: {BACKEND_URL}/health\n")

try:
    response = requests.get(f"{BACKEND_URL}/health", timeout=5)
    print(f"✓ Backend is running!")
    print(f"Status: {response.status_code}\n")
except requests.exceptions.ConnectionError:
    print(f"✗ Backend is not running on {BACKEND_URL}")
    print(f"Please start the Node.js backend:")
    print(f"  cd /Users/pallavdeshmukh/Documents/Coding/VoiceTrack_ColoHacks/backend")
    print(f"  npm start  # or node server.js\n")
    sys.exit(1)
except Exception as e:
    print(f"⚠️  Unexpected error: {e}\n")

# Test 2: Test transaction endpoint
print("Test 2: Testing transaction endpoint")
print(f"URL: {TRANSACTION_ENDPOINT}\n")

test_texts = [
    "आज मेरे दो रुपये के दस समोसे बेचे।",
    "मैंने 50 रुपये का दूध खरीदा",
    "maine 20 rupee ka chai becha",
]

for i, text in enumerate(test_texts, 1):
    print(f"Request {i}: {text}")

    try:
        response = requests.post(
            TRANSACTION_ENDPOINT,
            json={"text": text, "save": False},
            timeout=30,
        )

        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()

            sales = data.get('sales', [])
            expenses = data.get('expenses', [])
            meta = data.get('meta', {})

            print(f"✓ Success!")
            print(f"  Sales: {len(sales)}")
            if sales:
                for s in sales:
                    print(
                        f"    - {s.get('item')}: qty={s.get('qty')}, price={s.get('price')}")
            print(f"  Expenses: {len(expenses)}")
            if expenses:
                for e in expenses:
                    print(f"    - {e.get('item')}: ₹{e.get('amount')}")
            print(f"  Source: {meta.get('source', 'unknown')}")
            print(f"  Confidence: {meta.get('confidence', 'N/A')}\n")
        else:
            print(f"✗ Error: {response.status_code}")
            print(f"Response: {response.text[:300]}\n")

    except requests.exceptions.Timeout:
        print(f"✗ Request timeout (30s)\n")
    except requests.exceptions.ConnectionError:
        print(f"✗ Connection error - backend may have crashed\n")
    except Exception as e:
        print(f"✗ Error: {e}\n")

print("="*70)
print("  TEST COMPLETE")
print("="*70 + "\n")
