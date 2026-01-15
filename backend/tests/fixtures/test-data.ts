/**
 * Test Fixtures - Reusable test data
 */

export const TEST_IDS = {
  customers: {
    john: '11111111-1111-1111-1111-111111111111',
    jane: '22222222-2222-2222-2222-222222222222',
    bob: '33333333-3333-3333-3333-333333333333',
  },
  restaurants: {
    pizzaPalace: 'aaaa1111-1111-1111-1111-111111111111',
    burgerBarn: 'bbbb2222-2222-2222-2222-222222222222',
    sushiStation: 'cccc3333-3333-3333-3333-333333333333',
  },
  riders: {
    mike: 'd1d1d1d1-1111-1111-1111-111111111111',
    sarah: 'd2d2d2d2-2222-2222-2222-222222222222',
    tom: 'd3d3d3d3-3333-3333-3333-333333333333',
  },
};

export const SAMPLE_ORDERS = {
  pizzaOrder: {
    customerId: TEST_IDS.customers.john,
    restaurantId: TEST_IDS.restaurants.pizzaPalace,
    items: [
      { id: '1', name: 'Pepperoni Pizza', quantity: 2, price: 15.99 },
      { id: '2', name: 'Garlic Bread', quantity: 1, price: 4.99 },
    ],
    deliveryAddress: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip_code: '10001',
      latitude: 40.7128,
      longitude: -74.006,
    },
  },
  burgerOrder: {
    customerId: TEST_IDS.customers.jane,
    restaurantId: TEST_IDS.restaurants.burgerBarn,
    items: [
      { id: '1', name: 'Classic Burger', quantity: 1, price: 12.99 },
      { id: '2', name: 'Fries', quantity: 1, price: 3.99 },
      { id: '3', name: 'Soda', quantity: 2, price: 2.49 },
    ],
    deliveryAddress: {
      street: '456 Oak Ave',
      city: 'New York',
      state: 'NY',
      zip_code: '10002',
      latitude: 40.7580,
      longitude: -73.9855,
    },
  },
  sushiOrder: {
    customerId: TEST_IDS.customers.bob,
    restaurantId: TEST_IDS.restaurants.sushiStation,
    items: [
      { id: '1', name: 'Dragon Roll', quantity: 1, price: 18.99 },
      { id: '2', name: 'Miso Soup', quantity: 1, price: 4.99 },
    ],
    deliveryAddress: {
      street: '789 Elm Blvd',
      city: 'New York',
      state: 'NY',
      zip_code: '10003',
      latitude: 40.7489,
      longitude: -73.9680,
    },
  },
};

export const SAMPLE_LOCATIONS = {
  timesSquare: { latitude: 40.7580, longitude: -73.9855 },
  centralPark: { latitude: 40.7829, longitude: -73.9654 },
  brooklynBridge: { latitude: 40.7061, longitude: -73.9969 },
  wallStreet: { latitude: 40.7074, longitude: -74.0113 },
  empireteBuilding: { latitude: 40.7484, longitude: -73.9857 },
};

export const createOrderRequest = (overrides: any = {}) => ({
  ...SAMPLE_ORDERS.pizzaOrder,
  ...overrides,
});

export const createLocation = () => ({
  latitude: 40.7128 + Math.random() * 0.01,
  longitude: -74.006 + Math.random() * 0.01,
});
