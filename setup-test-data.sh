#!/bin/bash
# VibeLink API - Automated Test Data Setup
# This script creates real test data and saves IDs for Postman

echo "================================"
echo "VibeLink API - Test Data Setup"
echo "================================"
echo ""

BASE_URL="http://localhost:5000"

# Step 1: Register User 1
echo "📝 Registering User 1..."
USER1_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@vibelink.com",
    "username": "user1",
    "password": "TestPassword123!"
  }')

USER1_ID=$(echo "$USER1_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
TOKEN=$(echo "$USER1_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$USER1_ID" ]; then
  echo "✅ User 1 Created: $USER1_ID"
  echo "✅ Token: ${TOKEN:0:30}..."
else
  echo "❌ Failed to create User 1"
  exit 1
fi

# Step 2: Register User 2
echo ""
echo "📝 Registering User 2..."
USER2_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@vibelink.com",
    "username": "user2",
    "password": "TestPassword123!"
  }')

USER2_ID=$(echo "$USER2_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$USER2_ID" ]; then
  echo "✅ User 2 Created: $USER2_ID"
else
  echo "❌ Failed to create User 2"
  exit 1
fi

# Step 3: Get Rooms
echo ""
echo "🏠 Fetching Rooms..."
ROOMS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/rooms")

ROOM_ID=$(echo "$ROOMS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$ROOM_ID" ]; then
  echo "✅ Room ID: $ROOM_ID"
else
  echo "❌ No rooms found"
  exit 1
fi

# Step 4: Create Game Session
echo ""
echo "🎮 Creating Game Session..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/games/session" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"roomId\": \"$ROOM_ID\",
    \"participantIds\": [\"$USER1_ID\", \"$USER2_ID\"]
  }")

SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"id":"[^"]*' | tail -1 | cut -d'"' -f4)

if [ ! -z "$SESSION_ID" ]; then
  echo "✅ Game Session Created: $SESSION_ID"
else
  echo "❌ Failed to create Game Session"
  echo "Response: $SESSION_RESPONSE"
  exit 1
fi

# Save environment file for Postman
echo ""
echo "💾 Saving to postman_environment.json..."

cat > postman_environment.json << EOF
{
  "id": "vibelink-local",
  "name": "VibeLink Local",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000",
      "type": "string"
    },
    {
      "key": "token",
      "value": "$TOKEN",
      "type": "string"
    },
    {
      "key": "user1_id",
      "value": "$USER1_ID",
      "type": "string"
    },
    {
      "key": "user2_id",
      "value": "$USER2_ID",
      "type": "string"
    },
    {
      "key": "room_id",
      "value": "$ROOM_ID",
      "type": "string"
    },
    {
      "key": "session_id",
      "value": "$SESSION_ID",
      "type": "string"
    }
  ],
  "_postman_variable_scope": "environment"
}
EOF

# Print summary
echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Save these for your tests:"
echo "————————————————————————————"
echo "Token:      $TOKEN"
echo "User 1 ID:  $USER1_ID"
echo "User 2 ID:  $USER2_ID"
echo "Room ID:    $ROOM_ID"
echo "Session ID: $SESSION_ID"
echo ""
echo "📁 Postman Environment: postman_environment.json"
echo ""
echo "Use in Postman:"
echo "  1. Import: postman_environment.json"
echo "  2. Select environment from top right dropdown"
echo "  3. Use {{token}}, {{user1_id}}, etc. in requests"
