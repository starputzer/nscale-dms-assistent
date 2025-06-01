#!/bin/bash

# Script to analyze the chat streaming issue

echo "=== Chat Streaming Issue Analysis ==="
echo ""
echo "This script will help diagnose the JSON parsing error in chat streaming."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Checking for SSE parsing patterns...${NC}"
echo "Files that parse SSE data:"
grep -r "JSON\.parse.*event\.data\|JSON\.parse.*data" src/ --include="*.ts" --include="*.js" | grep -v node_modules | head -20

echo ""
echo -e "${YELLOW}2. Checking for 'data:' prefix handling...${NC}"
echo "Files that handle SSE data: prefix:"
grep -r "slice(6)\|substring(6)\|data:\s*{" src/ --include="*.ts" --include="*.js" | grep -v node_modules

echo ""
echo -e "${YELLOW}3. Checking EventSource usage...${NC}"
echo "Files using EventSource:"
grep -r "new EventSource\|EventSource" src/ --include="*.ts" --include="*.js" | grep -v node_modules | head -10

echo ""
echo -e "${YELLOW}4. Recent changes to streaming files...${NC}"
echo "Recently modified streaming-related files:"
find src/ -name "*.ts" -o -name "*.js" | xargs grep -l "stream\|SSE\|EventSource" | xargs ls -lt | head -10

echo ""
echo -e "${RED}Common Issues:${NC}"
echo "1. The error 'data: {\"response\": \"...\"}' suggests SSE-formatted data is being passed to JSON.parse"
echo "2. This typically happens when:"
echo "   - Raw SSE data is passed to a handler expecting parsed data"
echo "   - The 'data: ' prefix is not being stripped before parsing"
echo "   - There's a mismatch between EventSource (auto-strips prefix) and manual SSE parsing"
echo ""
echo -e "${GREEN}Solutions Applied:${NC}"
echo "1. Added safeParseSSEData() function to handle SSE-formatted data gracefully"
echo "2. Added additional debugging in sessions.ts to catch malformed SSE data"
echo "3. Added validation to ensure 'data:' prefix is removed before parsing"
echo ""
echo -e "${YELLOW}To debug further:${NC}"
echo "1. Check browser console for the new debug messages"
echo "2. Look for 'Processing SSE line:' and 'Data after removing' messages"
echo "3. Check if any 'WARNING: Line contains data:' messages appear"
echo "4. The safeParseSSEData function will log if it encounters SSE-formatted data"