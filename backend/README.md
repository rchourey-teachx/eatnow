# Food Delivery Backend

A real-time food delivery tracking system built with Node.js, TypeScript, Kafka, Redis, and PostgreSQL.

## Features

- **Order Management**: Create, track, and update order status
- **Rider Management**: Track rider online/offline status and locations
- **Real-time Matching**: Automatically match orders with available riders
- **Live Tracking**: Real-time order status from Redis for fast reads
- **Reassignment**: Automatic order reassignment when a rider goes offline
- **Event-Driven Architecture**: Kafka-based event processing for scalability

## Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **Message Queue**: Apache Kafka
- **Cache**: Redis
- **Database**: PostgreSQL
- **Container**: Docker & Docker Compose

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Express    │────▶│  PostgreSQL │
│   (API)     │     │   Server    │     │  (Storage)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │    Kafka    │
                    │  (Events)   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │  Order    │ │  Rider    │ │  Matching │
       │  Handler  │ │  Handler  │ │  Service  │
       └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │ (Live Data) │
                    └─────────────┘
```

## Kafka Topics

| Topic | Description |
|-------|-------------|
| `order.created` | Emitted when a new order is placed |
| `order.ready` | Emitted when restaurant marks order ready |
| `order.assigned` | Emitted when order is assigned to a rider |
| `order.delivered` | Emitted when order is delivered |
| `rider.online` | Emitted when rider goes online |
| `rider.location` | Emitted when rider updates location |
| `rider.offline` | Emitted when rider goes offline |

## Redis Keys

| Key Pattern | Description |
|-------------|-------------|
| `orders:unassigned` | Set of orders waiting for rider assignment |
| `riders:online` | Set of online riders |
| `order:{id}:status` | Current status of an order |
| `order:{id}:rider` | Assigned rider for an order |
| `rider:{id}:location` | Current location of a rider |
| `rider:{id}:current_order` | Current order being delivered by rider |

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- npm or yarn

### 1. Start Infrastructure

```bash
# Start Kafka, Redis, and PostgreSQL
docker-compose up -d
```

Wait for all services to be healthy (about 30 seconds).

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Database Migrations

```bash
npm run migrate
```

### 4. Seed Test Data

```bash
npm run seed
```

### 5. Start the Server

```bash
# Development mode
npm run dev

# Or production mode
npm run build
npm start
```

## API Endpoints

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create a new order |
| GET | `/api/orders/:id` | Get order details |
| GET | `/api/orders/:id/status` | Get live order status (from Redis) |
| POST | `/api/orders/:id/ready` | Mark order as ready |
| POST | `/api/orders/:id/pickup` | Mark order as picked up |
| POST | `/api/orders/:id/transit` | Mark order as in transit |
| POST | `/api/orders/:id/delivered` | Mark order as delivered |

### Riders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/riders` | Create a new rider |
| GET | `/api/riders` | List all riders |
| GET | `/api/riders/online` | List online riders |
| GET | `/api/riders/:id` | Get rider details |
| POST | `/api/riders/:id/online` | Rider goes online |
| POST | `/api/riders/:id/offline` | Rider goes offline |
| POST | `/api/riders/:id/location` | Update rider location |
| GET | `/api/riders/:id/location` | Get rider location |
| GET | `/api/riders/:id/current-order` | Get rider's current order |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Full health check |
| GET | `/api/health/ready` | Readiness check |
| GET | `/api/health/live` | Liveness check |

## Example Usage

### 1. Create an Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "11111111-1111-1111-1111-111111111111",
    "restaurantId": "aaaa1111-1111-1111-1111-111111111111",
    "items": [
      {"id": "1", "name": "Pepperoni Pizza", "quantity": 2, "price": 15.99}
    ],
    "deliveryAddress": {
      "street": "123 Customer St",
      "city": "New York",
      "state": "NY",
      "zip_code": "10001",
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }'
```

### 2. Mark Order as Ready (Restaurant)

```bash
curl -X POST http://localhost:3000/api/orders/{orderId}/ready
```

### 3. Rider Goes Online

```bash
curl -X POST http://localhost:3000/api/riders/rrrr1111-1111-1111-1111-111111111111/online \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

### 4. Check Order Status

```bash
curl http://localhost:3000/api/orders/{orderId}/status
```

### 5. Update Rider Location

```bash
curl -X POST http://localhost:3000/api/riders/rrrr1111-1111-1111-1111-111111111111/location \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7150,
    "longitude": -74.0050
  }'
```

### 6. Mark Order as Delivered

```bash
curl -X POST http://localhost:3000/api/orders/{orderId}/delivered
```

## Core Flows

### 1. Customer Places Order
1. Client sends POST to `/api/orders`
2. Order is saved to PostgreSQL
3. `order.created` event is emitted to Kafka
4. Order status is set in Redis

### 2. Restaurant Marks Order Ready
1. Restaurant sends POST to `/api/orders/:id/ready`
2. `order.ready` event is emitted
3. Order is added to `orders:unassigned` in Redis
4. Matching service checks for available riders

### 3. Rider Goes Online
1. Rider sends POST to `/api/riders/:id/online` with location
2. `rider.online` event is emitted
3. Rider is added to `riders:online` in Redis
4. Matching service checks for unassigned orders

### 4. Order Assignment
1. When `order.ready` or `rider.online` is received
2. Matching service checks Redis for order and available rider
3. If match found:
   - Order is removed from `orders:unassigned`
   - `order:{id}:rider` is set in Redis
   - `rider:{id}:current_order` is set in Redis
   - `order.assigned` event is emitted

### 5. Rider Goes Offline (Reassignment)
1. Rider sends POST to `/api/riders/:id/offline`
2. `rider.offline` event is emitted
3. If rider has active order:
   - Order is added back to `orders:unassigned`
   - Matching service tries to find a new rider

### 6. Live Order Status
1. Client sends GET to `/api/orders/:id/status`
2. Status is read from Redis (fast)
3. If not in Redis, falls back to PostgreSQL

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| NODE_ENV | development | Environment |
| POSTGRES_HOST | localhost | PostgreSQL host |
| POSTGRES_PORT | 5432 | PostgreSQL port |
| POSTGRES_USER | fooddelivery | PostgreSQL user |
| POSTGRES_PASSWORD | fooddelivery123 | PostgreSQL password |
| POSTGRES_DB | fooddelivery | PostgreSQL database |
| REDIS_HOST | localhost | Redis host |
| REDIS_PORT | 6379 | Redis port |
| KAFKA_BROKERS | localhost:9092 | Kafka brokers |
| KAFKA_CLIENT_ID | food-delivery-service | Kafka client ID |
| KAFKA_GROUP_ID | food-delivery-group | Kafka consumer group |

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Testing the Flow

1. Start infrastructure: `docker-compose up -d`
2. Run migrations: `npm run migrate`
3. Seed data: `npm run seed`
4. Start server: `npm run dev`
5. Create an order
6. Have a rider go online
7. Mark order ready - rider should be auto-assigned
8. Update rider location
9. Check order status to see rider location
10. Mark order as delivered
11. Rider becomes available for next order

## License

MIT
