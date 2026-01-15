#!/bin/bash

# Test script for Food Delivery Backend
# Usage: ./scripts/test-flow.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Food Delivery Backend Test Flow ===${NC}"
echo ""

# 1. Health Check
echo -e "${YELLOW}1. Health Check${NC}"
curl -s "$BASE_URL/api/health" | jq .
echo ""

# 2. Create an Order
echo -e "${YELLOW}2. Creating an Order${NC}"
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "11111111-1111-1111-1111-111111111111",
    "restaurantId": "aaaa1111-1111-1111-1111-111111111111",
    "items": [
      {"id": "1", "name": "Pepperoni Pizza", "quantity": 2, "price": 15.99},
      {"id": "2", "name": "Garlic Bread", "quantity": 1, "price": 4.99}
    ],
    "deliveryAddress": {
      "street": "123 Customer St",
      "city": "New York",
      "state": "NY",
      "zip_code": "10001",
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }')
echo "$ORDER_RESPONSE" | jq .

ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.order.id')
echo -e "${GREEN}Order ID: $ORDER_ID${NC}"
echo ""

# 3. Check Order Status
echo -e "${YELLOW}3. Checking Order Status${NC}"
curl -s "$BASE_URL/api/orders/$ORDER_ID/status" | jq .
echo ""

# 4. Rider Goes Online
RIDER_ID="rrrr1111-1111-1111-1111-111111111111"
echo -e "${YELLOW}4. Rider $RIDER_ID Goes Online${NC}"
curl -s -X POST "$BASE_URL/api/riders/$RIDER_ID/online" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060
  }' | jq .
echo ""

# Wait for event processing
sleep 2

# 5. Mark Order as Ready
echo -e "${YELLOW}5. Restaurant Marks Order Ready${NC}"
curl -s -X POST "$BASE_URL/api/orders/$ORDER_ID/ready" | jq .
echo ""

# Wait for matching to happen
sleep 2

# 6. Check Order Status Again (should show assigned)
echo -e "${YELLOW}6. Checking Order Status (should be assigned)${NC}"
curl -s "$BASE_URL/api/orders/$ORDER_ID/status" | jq .
echo ""

# 7. Check Rider's Current Order
echo -e "${YELLOW}7. Checking Rider's Current Order${NC}"
curl -s "$BASE_URL/api/riders/$RIDER_ID/current-order" | jq .
echo ""

# 8. Update Rider Location
echo -e "${YELLOW}8. Updating Rider Location${NC}"
curl -s -X POST "$BASE_URL/api/riders/$RIDER_ID/location" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7150,
    "longitude": -74.0050
  }' | jq .
echo ""

# Wait for location update
sleep 1

# 9. Check Order Status with Rider Location
echo -e "${YELLOW}9. Checking Order Status (should include rider location)${NC}"
curl -s "$BASE_URL/api/orders/$ORDER_ID/status" | jq .
echo ""

# 10. Mark Order as Picked Up
echo -e "${YELLOW}10. Rider Picks Up Order${NC}"
curl -s -X POST "$BASE_URL/api/orders/$ORDER_ID/pickup" | jq .
echo ""

# 11. Mark Order as In Transit
echo -e "${YELLOW}11. Order In Transit${NC}"
curl -s -X POST "$BASE_URL/api/orders/$ORDER_ID/transit" | jq .
echo ""

# 12. Check Status
echo -e "${YELLOW}12. Checking Order Status (in transit)${NC}"
curl -s "$BASE_URL/api/orders/$ORDER_ID/status" | jq .
echo ""

# 13. Mark Order as Delivered
echo -e "${YELLOW}13. Order Delivered${NC}"
curl -s -X POST "$BASE_URL/api/orders/$ORDER_ID/delivered" | jq .
echo ""

# Wait for event processing
sleep 1

# 14. Final Order Status
echo -e "${YELLOW}14. Final Order Status${NC}"
curl -s "$BASE_URL/api/orders/$ORDER_ID/status" | jq .
echo ""

# 15. Check Rider Status (should be available again)
echo -e "${YELLOW}15. Checking Rider's Current Order (should be null)${NC}"
curl -s "$BASE_URL/api/riders/$RIDER_ID/current-order" | jq .
echo ""

# 16. Get Matching Stats
echo -e "${YELLOW}16. Matching Stats${NC}"
curl -s "$BASE_URL/api/riders/stats/matching" | jq .
echo ""

echo -e "${GREEN}=== Test Flow Complete ===${NC}"
