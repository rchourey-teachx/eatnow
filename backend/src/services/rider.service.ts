import { v4 as uuidv4 } from 'uuid';
import { postgresClient } from '../database/postgres';
import { redisClient } from '../database/redis';
import { eventProducer } from '../kafka/producer';
import { RiderStatus } from '../config';
import { Rider, Location, RiderLocationUpdate } from '../types';

class RiderService {
  // Create a new rider
  async createRider(data: {
    name: string;
    phone: string;
    email: string;
    vehicleType: string;
  }): Promise<Rider> {
    const riderId = uuidv4();

    const query = `
      INSERT INTO riders (id, name, phone, email, vehicle_type, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      riderId,
      data.name,
      data.phone,
      data.email,
      data.vehicleType,
      RiderStatus.OFFLINE,
    ];

    const result = await postgresClient.query<any>(query, values);
    return this.mapToRider(result[0]);
  }

  // Get rider by ID
  async getRiderById(riderId: string): Promise<Rider | null> {
    const query = 'SELECT * FROM riders WHERE id = $1';
    const result = await postgresClient.query<any>(query, [riderId]);

    if (result.length === 0) return null;
    return this.mapToRider(result[0]);
  }

  // Get all riders
  async getAllRiders(): Promise<Rider[]> {
    const query = 'SELECT * FROM riders ORDER BY created_at DESC';
    const result = await postgresClient.query<any>(query);
    return result.map(this.mapToRider);
  }

  // Get online riders
  async getOnlineRiders(): Promise<any[]> {
    return redisClient.getOnlineRiders();
  }

  // Set rider online
  async goOnline(riderId: string, location: Location): Promise<Rider | null> {
    const rider = await this.getRiderById(riderId);
    if (!rider) return null;

    // Emit rider.online event
    await eventProducer.emitRiderOnline({
      riderId,
      location,
      timestamp: new Date().toISOString(),
    });

    return rider;
  }

  // Set rider offline
  async goOffline(riderId: string): Promise<Rider | null> {
    const rider = await this.getRiderById(riderId);
    if (!rider) return null;

    // Emit rider.offline event
    await eventProducer.emitRiderOffline({
      riderId,
      timestamp: new Date().toISOString(),
    });

    return rider;
  }

  // Update rider location
  async updateLocation(riderId: string, location: RiderLocationUpdate): Promise<void> {
    const currentOrderId = await redisClient.getRiderCurrentOrder(riderId);

    const locationWithTimestamp: Location = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: new Date(),
    };

    // Emit rider.location event
    await eventProducer.emitRiderLocation({
      riderId,
      location: locationWithTimestamp,
      currentOrderId: currentOrderId || undefined,
      timestamp: new Date().toISOString(),
    });
  }

  // Update rider status in database
  async updateRiderStatus(riderId: string, status: string): Promise<void> {
    const query = 'UPDATE riders SET status = $1 WHERE id = $2';
    await postgresClient.query(query, [status, riderId]);
  }

  // Save location to history
  async saveLocationHistory(riderId: string, location: Location): Promise<void> {
    const query = `
      INSERT INTO rider_location_history (rider_id, latitude, longitude)
      VALUES ($1, $2, $3)
    `;
    await postgresClient.query(query, [riderId, location.latitude, location.longitude]);
  }

  // Get rider's current location
  async getRiderLocation(riderId: string): Promise<Location | null> {
    return redisClient.getRiderLocation(riderId);
  }

  // Get rider's current order
  async getRiderCurrentOrder(riderId: string): Promise<string | null> {
    return redisClient.getRiderCurrentOrder(riderId);
  }

  // Check if rider is available
  async isRiderAvailable(riderId: string): Promise<boolean> {
    const isOnline = await redisClient.isRiderOnline(riderId);
    if (!isOnline) return false;

    return redisClient.isRiderAvailable(riderId);
  }

  // Get rider location history
  async getLocationHistory(riderId: string, limit: number = 100): Promise<Location[]> {
    const query = `
      SELECT latitude, longitude, recorded_at as timestamp
      FROM rider_location_history
      WHERE rider_id = $1
      ORDER BY recorded_at DESC
      LIMIT $2
    `;
    const result = await postgresClient.query<any>(query, [riderId, limit]);
    return result.map((row) => ({
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      timestamp: new Date(row.timestamp),
    }));
  }

  // Helper to map DB result to Rider type
  private mapToRider(row: any): Rider {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      vehicle_type: row.vehicle_type,
      status: row.status as RiderStatus,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}

export const riderService = new RiderService();
