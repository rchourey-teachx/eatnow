import dotenv from 'dotenv';

// Load environment variables for tests
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for async operations
jest.setTimeout(30000);

// Global teardown
afterAll(async () => {
  // Allow time for connections to close
  await new Promise((resolve) => setTimeout(resolve, 500));
});
