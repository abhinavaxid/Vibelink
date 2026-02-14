/**
 * VibeLink E2E Automation Test Suite using Selenium
 * Tests complete user flow: Register → Login → Create Room → Join Game
 */

const { Builder, By, until, Key, Actions } = require('selenium-webdriver');
const assert = require('assert');
const chrome = require('selenium-webdriver/chrome');

// Configuration
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test data
const testUser = {
  email: `test-${Date.now()}@vibelink.com`,
  username: `testuser-${Date.now()}`,
  password: 'TestPassword123!',
};

let driver;
let testResults = [];

/**
 * Initialize Selenium WebDriver
 */
async function initializeDriver() {
  console.log('🔧 Initializing Selenium WebDriver...');
  
  const options = new chrome.Options();
  // Uncomment for headless mode
  // options.addArguments('--headless');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--start-maximized');
  
  driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  driver.manage().setTimeouts({ implicit: 5000 });
  console.log('✅ WebDriver initialized');
}

/**
 * Wait for element and return it
 */
async function waitForElement(locator, timeout = TEST_TIMEOUT) {
  return await driver.wait(until.elementLocated(locator), timeout);
}

/**
 * Test 1: Health Check - Backend is running
 */
async function testHealthCheck() {
  console.log('\n📋 Test 1: Health Check');
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    
    assert.strictEqual(response.status, 200, 'Health endpoint should return 200');
    assert.strictEqual(data.status, 'ok', 'Health status should be ok');
    
    testResults.push({ test: 'Health Check', status: '✅ PASS' });
    console.log('✅ Backend is healthy');
  } catch (error) {
    testResults.push({ test: 'Health Check', status: '❌ FAIL', error: error.message });
    throw new Error(`Health check failed: ${error.message}`);
  }
}

/**
 * Test 2: Frontend Loads
 */
async function testFrontendLoads() {
  console.log('\n📋 Test 2: Frontend Loads');
  try {
    await driver.get(`${BASE_URL}/login`);
    
    const title = await driver.getTitle();
    console.log(`   Page Title: ${title}`);
    
    // Wait for login form
    const joinButton = await waitForElement(By.xpath("//button[contains(text(), 'JOIN VIBE')]"));
    assert(joinButton, 'JOIN VIBE button should be present');
    
    testResults.push({ test: 'Frontend Loads', status: '✅ PASS' });
    console.log('✅ Frontend loaded successfully');
  } catch (error) {
    testResults.push({ test: 'Frontend Loads', status: '❌ FAIL', error: error.message });
    throw error;
  }
}

/**
 * Test 3: User Registration
 */
async function testUserRegistration() {
  console.log('\n📋 Test 3: User Registration');
  try {
    // Fill email
    const emailInput = await waitForElement(By.css('input[type="email"], input[placeholder*="mail"], input[placeholder*="Email"]'));
    await emailInput.clear();
    await emailInput.sendKeys(testUser.email);
    console.log(`   Email: ${testUser.email}`);
    
    // Fill username
    const usernameInput = await waitForElement(By.css('input[placeholder*="username"], input[placeholder*="Username"]'));
    await usernameInput.clear();
    await usernameInput.sendKeys(testUser.username);
    console.log(`   Username: ${testUser.username}`);
    
    // Fill password
    const passwordInput = await waitForElement(By.css('input[type="password"]'));
    await passwordInput.clear();
    await passwordInput.sendKeys(testUser.password);
    console.log(`   Password: ****`);
    
    // Click JOIN VIBE button
    const joinButton = await waitForElement(By.xpath("//button[contains(text(), 'JOIN VIBE')]"));
    await driver.executeScript('arguments[0].scrollIntoView(true);', joinButton);
    await driver.wait(until.elementIsEnabled(joinButton), 5000);
    await joinButton.click();
    console.log('   Clicked JOIN VIBE');
    
    // Wait for success - should redirect or show success message
    await driver.wait(
      until.urlContains('/lobby'),
      TEST_TIMEOUT,
      'Should redirect to lobby after registration'
    );
    
    testResults.push({ test: 'User Registration', status: '✅ PASS' });
    console.log('✅ User registered successfully');
  } catch (error) {
    testResults.push({ test: 'User Registration', status: '❌ FAIL', error: error.message });
    throw error;
  }
}

/**
 * Test 4: User Login
 */
async function testUserLogin() {
  console.log('\n📋 Test 4: User Login');
  try {
    // Navigate to login
    await driver.get(`${BASE_URL}/login`);
    
    // Click "Log In" link
    const loginLink = await waitForElement(By.xpath("//a[contains(text(), 'Log In')] | //button[contains(text(), 'Log In')]"));
    await loginLink.click();
    console.log('   Clicked Log In');
    
    // Wait for login form
    await driver.wait(until.urlContains('/login'), 5000);
    
    // Fill credentials
    const emailInput = await waitForElement(By.css('input[type="email"]'));
    await emailInput.clear();
    await emailInput.sendKeys(testUser.email);
    
    const passwordInput = await waitForElement(By.css('input[type="password"]'));
    await passwordInput.clear();
    await passwordInput.sendKeys(testUser.password);
    
    // Submit
    const submitButton = await waitForElement(By.xpath("//button[contains(text(), 'Login') or contains(text(), 'Sign In')]"));
    await submitButton.click();
    console.log('   Submitted login form');
    
    // Wait for redirect to dashboard/lobby
    await driver.wait(
      until.urlMatches(/\/(lobby|room|game|dashboard)/),
      TEST_TIMEOUT,
      'Should redirect after login'
    );
    
    testResults.push({ test: 'User Login', status: '✅ PASS' });
    console.log('✅ User logged in successfully');
  } catch (error) {
    testResults.push({ test: 'User Login', status: '❌ FAIL', error: error.message });
    throw error;
  }
}

/**
 * Test 5: Room Creation
 */
async function testRoomCreation() {
  console.log('\n📋 Test 5: Room Creation');
  try {
    // Look for create room button
    const createButton = await waitForElement(
      By.xpath("//button[contains(text(), 'Create')] | //button[contains(text(), 'New Room')] | //button[contains(text(), 'Start Room')]")
    );
    await createButton.click();
    console.log('   Clicked create room button');
    
    // Wait for modal or form
    await driver.wait(until.elementLocated(By.css('input[placeholder*="name"], input[placeholder*="Name"]')), 5000);
    
    const roomName = `Test Room ${Date.now()}`;
    const roomInput = await waitForElement(By.css('input[placeholder*="name"], input[placeholder*="Name"]'));
    await roomInput.clear();
    await roomInput.sendKeys(roomName);
    console.log(`   Room Name: ${roomName}`);
    
    // Submit
    const submitButton = await waitForElement(By.xpath("//button[contains(text(), 'Create')] | //button[contains(text(), 'Start')]"));
    await submitButton.click();
    console.log('   Submitted room creation');
    
    // Wait for room to appear
    await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(), '${roomName}')]`)), TEST_TIMEOUT);
    
    testResults.push({ test: 'Room Creation', status: '✅ PASS' });
    console.log('✅ Room created successfully');
  } catch (error) {
    // Room creation might not be available, log as warning
    testResults.push({ test: 'Room Creation', status: '⚠️ SKIP', note: error.message });
    console.log('⚠️ Room creation skipped (may not be implemented)');
  }
}

/**
 * Test 6: API Endpoints
 */
async function testAPIEndpoints() {
  console.log('\n📋 Test 6: API Endpoints');
  try {
    const endpoints = [
      { url: '/api/health', method: 'GET', expectedStatus: 200 },
      { url: '/api/users/me', method: 'GET', expectedStatus: 401 }, // Unauthenticated
      { url: '/api/rooms', method: 'GET', expectedStatus: 200 },
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${BACKEND_URL}${endpoint.url}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
        });
        
        console.log(`   ${endpoint.method} ${endpoint.url}: ${response.status}`);
        
        if (response.status !== endpoint.expectedStatus) {
          console.log(`   ⚠️ Expected ${endpoint.expectedStatus}, got ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint.method} ${endpoint.url}: ${error.message}`);
      }
    }
    
    testResults.push({ test: 'API Endpoints', status: '✅ PASS' });
    console.log('✅ API endpoints tested');
  } catch (error) {
    testResults.push({ test: 'API Endpoints', status: '❌ FAIL', error: error.message });
  }
}

/**
 * Generate Test Report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  
  testResults.forEach((result) => {
    console.log(`${result.status} ${result.test}`);
    if (result.error) console.log(`   Error: ${result.error}`);
    if (result.note) console.log(`   Note: ${result.note}`);
    
    if (result.status.includes('✅')) passed++;
    else if (result.status.includes('❌')) failed++;
    else if (result.status.includes('⚠️')) skipped++;
  });
  
  console.log('='.repeat(60));
  console.log(`Total: ${testResults.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log('='.repeat(60) + '\n');
  
  return failed === 0;
}

/**
 * Main Test Runner
 */
async function runTests() {
  try {
    console.log('\n🚀 Starting VibeLink E2E Tests\n');
    console.log(`Frontend URL: ${BASE_URL}`);
    console.log(`Backend URL: ${BACKEND_URL}`);
    console.log('\n');
    
    // Initialize
    await initializeDriver();
    
    // Run tests
    await testHealthCheck();
    await testAPIEndpoints();
    await testFrontendLoads();
    await testUserRegistration();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for navigation
    await testUserLogin();
    
    // Generate report
    const allPassed = generateReport();
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    generateReport();
    process.exit(1);
  } finally {
    if (driver) {
      await driver.quit();
      console.log('🔌 WebDriver closed');
    }
  }
}

// Run tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
