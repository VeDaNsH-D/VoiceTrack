#!/bin/bash
set -e

echo "=========================================="
echo "  VoiceTrack Extraction Pipeline Test"
echo "=========================================="
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Test 1: Checking Python environment${NC}"
$PYTHON_CMD --version
echo ""

echo -e "${YELLOW}Test 2: Running extraction debug script${NC}"
cd /Users/pallavdeshmukh/Documents/Coding/VoiceTrack_ColoHacks
$PYTHON_CMD app/debug_extraction.py
echo ""

echo -e "${GREEN}All tests completed!${NC}"
