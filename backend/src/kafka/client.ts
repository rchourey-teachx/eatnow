import { Kafka, Producer, Consumer, Admin, EachMessagePayload } from 'kafkajs';
import { config, KAFKA_TOPICS } from '../config';

class KafkaClient {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private admin: Admin;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: config.kafka.groupId });
    this.admin = this.kafka.admin();
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.admin.connect();
      await this.createTopics();
      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;
      console.log('Kafka client connected successfully');
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  private async createTopics(): Promise<void> {
    const topics = Object.values(KAFKA_TOPICS).map((topic) => ({
      topic,
      numPartitions: 3,
      replicationFactor: 1,
    }));

    try {
      await this.admin.createTopics({
        topics,
        waitForLeaders: true,
      });
      console.log('Kafka topics created/verified');
    } catch (error) {
      console.log('Topics may already exist:', error);
    }
  }

  async produce(topic: string, message: object, key?: string): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: key || undefined,
            value: JSON.stringify(message),
            timestamp: Date.now().toString(),
          },
        ],
      });
      console.log(`Message produced to topic ${topic}:`, message);
    } catch (error) {
      console.error(`Failed to produce message to ${topic}:`, error);
      throw error;
    }
  }

  async subscribe(topics: string[]): Promise<void> {
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }
    console.log(`Subscribed to topics: ${topics.join(', ')}`);
  }

  async startConsuming(
    handlers: Map<string, (payload: EachMessagePayload) => Promise<void>>
  ): Promise<void> {
    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, partition, message } = payload;
        console.log(`Received message from ${topic}[${partition}]:`, message.value?.toString());

        const handler = handlers.get(topic);
        if (handler) {
          try {
            await handler(payload);
          } catch (error) {
            console.error(`Error handling message from ${topic}:`, error);
          }
        } else {
          console.warn(`No handler registered for topic: ${topic}`);
        }
      },
    });
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    await this.admin.disconnect();
    this.isConnected = false;
    console.log('Kafka client disconnected');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const kafkaClient = new KafkaClient();
