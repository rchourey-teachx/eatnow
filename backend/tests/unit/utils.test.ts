/**
 * Unit Tests for Utility Functions
 * Tests helper functions used across the application
 */

describe('Distance Calculation', () => {
  // Haversine distance formula (same as in matching service)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  it('should calculate zero distance for same location', () => {
    const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
    expect(distance).toBeCloseTo(0, 5);
  });

  it('should calculate correct distance between two NYC locations', () => {
    // Times Square to Central Park (approximately 2.7 km)
    const distance = calculateDistance(40.758, -73.9855, 40.7829, -73.9654);
    expect(distance).toBeGreaterThan(2);
    expect(distance).toBeLessThan(4);
  });

  it('should calculate correct distance for longer distances', () => {
    // NYC to LA (approximately 3944 km)
    const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(distance).toBeGreaterThan(3900);
    expect(distance).toBeLessThan(4000);
  });

  it('should handle negative coordinates (southern hemisphere)', () => {
    // Sydney to Melbourne
    const distance = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631);
    expect(distance).toBeGreaterThan(700);
    expect(distance).toBeLessThan(900);
  });

  it('should be symmetric', () => {
    const distance1 = calculateDistance(40.7128, -74.006, 40.758, -73.9855);
    const distance2 = calculateDistance(40.758, -73.9855, 40.7128, -74.006);
    expect(distance1).toBeCloseTo(distance2, 10);
  });
});

describe('Order Amount Calculation', () => {
  interface OrderItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }

  const calculateTotal = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  it('should calculate total for single item', () => {
    const items = [{ id: '1', name: 'Pizza', quantity: 1, price: 15.99 }];
    expect(calculateTotal(items)).toBeCloseTo(15.99, 2);
  });

  it('should calculate total for multiple items', () => {
    const items = [
      { id: '1', name: 'Pizza', quantity: 2, price: 15.99 },
      { id: '2', name: 'Soda', quantity: 3, price: 2.49 },
    ];
    // 2 * 15.99 + 3 * 2.49 = 31.98 + 7.47 = 39.45
    expect(calculateTotal(items)).toBeCloseTo(39.45, 2);
  });

  it('should return zero for empty order', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('should handle high quantities', () => {
    const items = [{ id: '1', name: 'Item', quantity: 100, price: 1.0 }];
    expect(calculateTotal(items)).toBe(100);
  });
});

describe('UUID Validation', () => {
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  it('should validate correct UUIDs', () => {
    expect(isValidUUID('11111111-1111-1111-1111-111111111111')).toBe(true);
    expect(isValidUUID('aaaa1111-1111-1111-1111-111111111111')).toBe(true);
    expect(isValidUUID('d1d1d1d1-1111-1111-1111-111111111111')).toBe(true);
  });

  it('should reject invalid UUIDs', () => {
    expect(isValidUUID('invalid')).toBe(false);
    expect(isValidUUID('rrrr1111-1111-1111-1111-111111111111')).toBe(false); // r is not hex
    expect(isValidUUID('1111-1111-1111-1111-111111111111')).toBe(false); // wrong format
    expect(isValidUUID('')).toBe(false);
  });
});

describe('Status Transitions', () => {
  const validTransitions: Record<string, string[]> = {
    'created': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['assigned', 'cancelled'],
    'assigned': ['picked_up', 'ready', 'cancelled'],
    'picked_up': ['in_transit', 'cancelled'],
    'in_transit': ['delivered', 'cancelled'],
    'delivered': [],
    'cancelled': [],
  };

  const isValidTransition = (from: string, to: string): boolean => {
    return validTransitions[from]?.includes(to) ?? false;
  };

  it('should allow valid transitions', () => {
    expect(isValidTransition('created', 'confirmed')).toBe(true);
    expect(isValidTransition('ready', 'assigned')).toBe(true);
    expect(isValidTransition('assigned', 'picked_up')).toBe(true);
    expect(isValidTransition('in_transit', 'delivered')).toBe(true);
  });

  it('should reject invalid transitions', () => {
    expect(isValidTransition('created', 'delivered')).toBe(false);
    expect(isValidTransition('delivered', 'created')).toBe(false);
    expect(isValidTransition('cancelled', 'ready')).toBe(false);
  });

  it('should allow reassignment from assigned to ready', () => {
    expect(isValidTransition('assigned', 'ready')).toBe(true);
  });

  it('should allow cancellation from most states', () => {
    expect(isValidTransition('created', 'cancelled')).toBe(true);
    expect(isValidTransition('ready', 'cancelled')).toBe(true);
    expect(isValidTransition('assigned', 'cancelled')).toBe(true);
  });
});
