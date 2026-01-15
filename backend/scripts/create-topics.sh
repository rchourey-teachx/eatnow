#!/bin/bash

# Script to create Kafka topics manually
# Usage: ./scripts/create-topics.sh

KAFKA_CONTAINER="kafka"

echo "Creating Kafka topics..."

docker exec $KAFKA_CONTAINER kafka-topics --create --if-not-exists \
  --bootstrap-server localhost:9092 \
  --topic order.created \
  --partitions 3 \
  --replication-factor 1

docker exec $KAFKA_CONTAINER kafka-topics --create --if-not-exists \
  --bootstrap-server localhost:9092 \
  --topic order.ready \
  --partitions 3 \
  --replication-factor 1

docker exec $KAFKA_CONTAINER kafka-topics --create --if-not-exists \
  --bootstrap-server localhost:9092 \
  --topic order.assigned \
  --partitions 3 \
  --replication-factor 1

docker exec $KAFKA_CONTAINER kafka-topics --create --if-not-exists \
  --bootstrap-server localhost:9092 \
  --topic order.delivered \
  --partitions 3 \
  --replication-factor 1

docker exec $KAFKA_CONTAINER kafka-topics --create --if-not-exists \
  --bootstrap-server localhost:9092 \
  --topic rider.online \
  --partitions 3 \
  --replication-factor 1

docker exec $KAFKA_CONTAINER kafka-topics --create --if-not-exists \
  --bootstrap-server localhost:9092 \
  --topic rider.location \
  --partitions 3 \
  --replication-factor 1

docker exec $KAFKA_CONTAINER kafka-topics --create --if-not-exists \
  --bootstrap-server localhost:9092 \
  --topic rider.offline \
  --partitions 3 \
  --replication-factor 1

echo "Listing all topics:"
docker exec $KAFKA_CONTAINER kafka-topics --list --bootstrap-server localhost:9092

echo "Done!"
