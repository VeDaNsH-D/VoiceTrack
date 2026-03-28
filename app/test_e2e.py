#!/usr/bin/env python3
"""
Simple end-to-end test of the extraction pipeline with latest models.
"""

import json
from app.services.llm_structurer import structure_transcript
import sys
from pathlib import Path

app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir.parent))


print("\n" + "="*70)
print("  VOICETRACK EXTRACTION PIPELINE E2E TEST")
print("="*70 + "\n")

# Test cases
test_cases = [
    ("आज मेरे दो रुपये के दस समोसे बेचे।", "Hindi: 10 samosas sold",
     "Should extract as sale"),
    ("मैंने 50 रुपये का दूध खरीदा", "Hindi: Bought milk for ₹50",
     "Should extract as expense"),
    ("maine 20 rupee ka chai becha", "Hinglish: Sold tea for ₹20",
     "Should extract as sale"),
]

for i, (text, description, expectation) in enumerate(test_cases, 1):
    print(f"Test {i}: {description}")
    print(f"Expectation: {expectation}")
    print(f"Input: {text}\n")

    try:
        result = structure_transcript(text)

        sales = result.get('sales', [])
        expenses = result.get('expenses', [])
        meta = result.get('meta', {})

        print(f"✓ SUCCESS")
        print(f"  Sales: {len(sales)}")
        if sales:
            for s in sales:
                print(
                    f"    - {s.get('item')}: qty={s.get('qty')}, price={s.get('price')}")
        print(f"  Expenses: {len(expenses)}")
        if expenses:
            for e in expenses:
                print(f"    - {e.get('item')}: ₹{e.get('amount')}")
        print(f"  Confidence: {meta.get('confidence', 'N/A')}")
        print(f"  Source: {meta.get('source', 'unknown')}")

    except Exception as e:
        print(f"✗ FAILED: {e}")

    print("-" * 70 + "\n")

print("="*70)
print("  END-TO-END TEST COMPLETE")
print("="*70 + "\n")
