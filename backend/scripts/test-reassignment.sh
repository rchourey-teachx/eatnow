#!/bin/bash

# Test script for Rider Reassignment Flow
# Usage: ./scripts/test-reassignment.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Rider Reassignment Test Flow ===${NC}"
echo ""

# 1. Create an Order
echo -e "${YELLOW}1. Creating an Order${NC}"
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "11111111-1111-1111-1111-111111111111",
    "restaurantId": "aaaa1111-1111-1111-1111-111111111111",
    "items": [{"id": "1", "name": "Test Pizza", "quantity": 1, "price": 10.00}],
    "deliveryAddress": {
      "street": "123 Test St",
      "city": "New York",
      "state": "NY",
      "zip_code": "10001",
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }')
ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.order.id')
echo -e "${GREEN}Order ID: $ORDER_ID${NC}"
echo ""

# 2. First Rider Goes Online
RIDER1_ID="rrrr1111-1111-1111-1111-111111111111"
echo -e "${YELLOW}2. Rider 1 ($RIDER1_ID) Goes Online${NC}"
curl -s -X POST "$BASE_URL/api/riders/$RIDER1_ID/online" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 40.7128, "longitude": -74.0060}' | jq .
echo ""
sleep 1

# 3. Second Rider Goes Online
RIDER2_ID="rrrr2222-2222-2222-2222-222222222222"
echo -e "${YELLOW}3. Rider 2 ($RIDER2_ID) Goes Online${NC}"
curl -s -X POST "$BASE_URL/api/riders/$RIDER2_ID/online" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 40.7200, "longitude": -74.0100}' | jq .
echo ""
sleep 1

# 4. Mark Order Ready (should be assigned to Rider 1)
echo -e "${YELLOW}4. Restaurant Marks Order Ready${NC}"
curl -s -X POST "$BASE_URL/api/orders/$ORDER_ID/ready" | jq .
sleep 2
echo ""

# 5. Check Order Status
echo -e "${YELLOW}5. Checking Order Status (should be assigned to Rider 1)${NC}"
curl -s "$BASE_URL/api/orders/$ORDER_ID/status" | jq .
echo ""

# 6. Check both riders' current orders
echo -e "${YELLOW}6. Checking Rider 1's Current Order${NC}"
curl -s "$BASE_URL/api/riders/$RIDER1_ID/current-order" | jq .
echo ""

echo -e "${YELLOW}7. Checking Rider 2's Current Order (should be null)${NC}"
curl -s "$BASE_URL/api/riders/$RIDER2_ID/current-order" | jq .
echo ""

# 8. Rider 1 Goes Offline (simulating rider drop)
echo -e "${RED}8. Rider 1 Goes OFFLINE (Drop!)${NC}"
curl -s -X POST "$BASE_URL/api/riders/$RIDER1_ID/offline" | jq .
echo ""
sleep 2

# 9. Check Order Status (should be reassigned to Rider 2)
echo -e "${YELLOW}9. Checking Order Status (should be reassigned to Rider 2)${NC}"
curl -s "$BASE_URL/api/orders/$ORDER_ID/status" | jq .
echo ""

# 10. Check both riders' current orders after reassignment
echo -e "${YELLOW}10. Checking Rider 1's Current Order (should be null)${NC}"
curl -s "$BASE_URL/api/riders/$RIDER1_ID/current-order" | jq .
echo ""

echo -e "${YELLOW}11. Checking Rider 2's Current Order (should have the order)${NC}"
curl -s "$BASE_URL/api/riders/$RIDER2_ID/current-order" | jq .
echo ""

# Cleanup - let Rider 2 go offline as well
echo -e "${YELLOW}12. Cleanup - Rider 2 Goes Offline${NC}"
curl -s -X POST "$BASE_URL/api/riders/$RIDER2_ID/offline" | jq .
echo ""

echo -e "${GREEN}=== Reassignment Test Complete ===${NC}"
