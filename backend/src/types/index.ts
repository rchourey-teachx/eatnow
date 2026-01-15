import { OrderStatus, RiderStatus } from '../config';

// Database Models
export interface Order {
  id: string;
  customer_id: string;
  restaurant_id: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  delivery_address: Address;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle_type: string;
  status: RiderStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Restaurant {
  id: string;
  name: string;
  address: Address;
  phone: string;
  created_at: Date;
  updated_at: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

// Location
export interface Location {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

// Kafka Events
export interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
  restaurantId: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: Address;
  timestamp: string;
}

export interface OrderReadyEvent {
  orderId: string;
  restaurantId: string;
  restaurantLocation: Location;
  timestamp: string;
}

export interface OrderAssignedEvent {
  orderId: string;
  riderId: string;
  restaurantId: string;
  estimatedPickupTime: string;
  timestamp: string;
}

export interface OrderDeliveredEvent {
  orderId: string;
  riderId: string;
  deliveredAt: string;
  timestamp: string;
}

export interface RiderOnlineEvent {
  riderId: string;
  location: Location;
  timestamp: string;
}

export interface RiderLocationEvent {
  riderId: string;
  location: Location;
  currentOrderId?: string;
  timestamp: string;
}

export interface RiderOfflineEvent {
  riderId: string;
  timestamp: string;
}

// API Request/Response Types
export interface CreateOrderRequest {
  customerId: string;
  restaurantId: string;
  items: OrderItem[];
  deliveryAddress: Address;
}

export interface OrderStatusResponse {
  orderId: string;
  status: OrderStatus;
  riderId?: string;
  riderLocation?: Location;
  estimatedDeliveryTime?: string;
  updatedAt: string;
}

export interface RiderLocationUpdate {
  latitude: number;
  longitude: number;
}
