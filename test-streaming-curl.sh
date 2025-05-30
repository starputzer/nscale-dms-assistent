#!/bin/bash

# Direct streaming endpoint test using curl
# This tests the raw HTTP response without any JavaScript processing

echo "=== Direct Streaming Test with curl ==="
echo

# Default values
API_URL="${API_URL:-http://localhost:5000/api/question/stream}"
QUESTION="${1:-Was ist nscale?}"
AUTH_TOKEN="${2:-}"
SESSION_ID="test-session-$(date +%s)"

echo "Configuration:"
echo "  API URL: $API_URL"
echo "  Question: $QUESTION"
echo "  Session ID: $SESSION_ID"
echo "  Auth: ${AUTH_TOKEN:+Token provided}"
echo

# Build JSON payload
PAYLOAD=$(cat <<EOF
{
  "question": "$QUESTION",
  "session_id": "$SESSION_ID",
  "context": [],
  "stream": true
}
EOF
)

echo "Request payload:"
echo "$PAYLOAD" | jq . 2>/dev/null || echo "$PAYLOAD"
echo

# Build curl command
CURL_CMD="curl -v -X POST '$API_URL'"
CURL_CMD="$CURL_CMD -H 'Content-Type: application/json'"
CURL_CMD="$CURL_CMD -H 'Accept: text/event-stream'"

if [ -n "$AUTH_TOKEN" ]; then
    CURL_CMD="$CURL_CMD -H 'Authorization: Bearer $AUTH_TOKEN'"
fi

CURL_CMD="$CURL_CMD -d '$PAYLOAD'"
CURL_CMD="$CURL_CMD --no-buffer"

echo "Curl command:"
echo "$CURL_CMD"
echo
echo "=== Response ==="
echo

# Execute curl and show raw response
eval "$CURL_CMD" 2>&1 | while IFS= read -r line; do
    # Color code the output
    if [[ "$line" =~ ^data: ]]; then
        # SSE data lines in green
        echo -e "\033[32m$line\033[0m"
    elif [[ "$line" =~ ^\* ]]; then
        # Curl debug lines in gray
        echo -e "\033[90m$line\033[0m"
    elif [[ "$line" =~ ^HTTP ]]; then
        # HTTP status in blue
        echo -e "\033[34m$line\033[0m"
    elif [[ "$line" =~ ^[<>] ]]; then
        # Headers in yellow
        echo -e "\033[33m$line\033[0m"
    else
        echo "$line"
    fi
done

echo
echo "=== Test complete ==="
echo
echo "To test with authentication:"
echo "  1. Get your auth token from the browser (localStorage.authToken)"
echo "  2. Run: $0 \"Your question\" \"your-auth-token\""
echo
echo "To test non-streaming endpoint:"
echo "  API_URL=http://localhost:5000/api/question $0"
echo
echo "To save raw output:"
echo "  $0 > output.txt 2>&1"