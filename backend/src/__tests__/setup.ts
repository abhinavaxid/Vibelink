import { dropAllTables, initializeDatabase } from '@/database/init';
import { disconnect } from '@/database/connection';

/**
 * Test Setup
 * Runs before all tests
 */

beforeAll(async () => {
  try {
    // Initialize test database
    await initializeDatabase();
    console.log('✅ Test database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize test database', error);
    throw error;
  }
});

/**
 * Teardown after all tests
 */
afterAll(async () => {
  try {
    await disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Failed to disconnect database', error);
  }
});

/**
 * Clear database after each test
 */
afterEach(async () => {
  try {
    // You might want to clear specific tables here
    // For now, we'll keep data to test relationships
  } catch (error) {
    console.error('❌ Failed to clean up after test', error);
  }
});

export {};
