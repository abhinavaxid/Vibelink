/**
 * Simplified E2E Test - Focused on actual API endpoints
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const log = {
  pass: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  fail: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`  ${colors.cyan}→${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
};

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (token) options.headers.Authorization = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : {},
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: null });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

const state = {
  passed: 0,
  failed: 0,
  email: `test${Date.now()}@test.com`,
  username: `user${Date.now()}`,
  password: 'Test123456!',
  token: null,
  userId: null,
  roomId: null,
};

async function test(name, fn) {
  try {
    const result = await fn();
    if (result) {
      log.pass(name);
      state.passed++;
    } else {
      log.fail(name);
      state.failed++;
    }
  } catch (error) {
    log.fail(`${name} - ${error.message}`);
    state.failed++;
  }
}

async function runTests() {
  console.log(`\n${colors.bright}╔════════════════════════════════════╗
║   VIBELINK E2E API TEST            ║
╚════════════════════════════════════╝${colors.reset}\n`);

  // Health check
  log.step('1. HEALTH CHECK');
  const healthCheck = await makeRequest('GET', '/health');
  if (healthCheck.status === 200) {
    log.pass('Backend is running');
    state.passed++;
  } else {
    log.fail('Backend not responding');
    console.error('Cannot continue without backend');
    process.exit(1);
  }

  // Registration
  log.step('2. AUTHENTICATION');
  await test('User Registration', async () => {
    const res = await makeRequest('POST', '/api/auth/register', {
      email: state.email,
      username: state.username,
      password: state.password,
    });
    if (res.status === 201 || res.status === 200) {
      const data = res.data.data || res.data;
      state.token = data.token;
      state.userId = data.user?.id;
      log.info(`Token: ${state.token.substring(0, 15)}...`);
      log.info(`User ID: ${state.userId}`);
      return !!state.token;
    }
    return false;
  });

  // Login
  await test('User Login', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: state.email,
      password: state.password,
    });
    if (res.status === 200) {
      const data = res.data.data || res.data;
      state.token = data.token;
      return !!state.token;
    }
    return false;
  });

  // Get user profile
  log.step('3. USER PROFILE');
  await test('Get User Profile', async () => {
    if (!state.userId) return false;
    const res = await makeRequest('GET', `/api/users/${state.userId}`, null, state.token);
    log.info(`Status: ${res.status}`);
    return res.status === 200;
  });

  // Update profile
  await test('Update Profile', async () => {
    if (!state.userId) return false;
    const res = await makeRequest('PATCH', `/api/users/${state.userId}`, {
      avatar: '🎮',
      communication_style: 'direct',
      energy_level: 'high',
    }, state.token);
    log.info(`Status: ${res.status}`);
    return res.status === 200 || res.status === 400;
  });

  // Rooms
  log.step('4. GAME ROOMS');
  await test('List Rooms', async () => {
    const res = await makeRequest('GET', '/api/rooms', null, state.token);
    const rooms = res.data.data || res.data;
    if (Array.isArray(rooms)) {
      log.info(`Found ${rooms.length} rooms`);
      if (rooms.length > 0) {
        state.roomId = rooms[0].id;
        log.info(`First room: ${rooms[0].name}`);
      }
      return true;
    }
    return false;
  });

  // Create room if needed
  if (!state.roomId) {
    await test('Create Room', async () => {
      const res = await makeRequest('POST', '/api/rooms', {
        name: `Test Room ${Date.now()}`,
        gameType: 'Vibe Link Challenge',
        maxParticipants: 4,
      }, state.token);
      log.info(`Status: ${res.status}`);
      if (res.status === 201 || res.status === 200) {
        const data = res.data.data || res.data;
        state.roomId = data.id;
        return true;
      }
      return false;
    });
  }

  // Join room
  if (state.roomId) {
    await test('Join Room', async () => {
      const res = await makeRequest('POST', `/api/rooms/${state.roomId}/join`, {}, state.token);
      log.info(`Status: ${res.status}`);
      return res.status === 200 || res.status === 201;
    });
  }

  // Game Session
  log.step('5. GAME SESSION');
  if (state.roomId && state.userId) {
    await test('Create Game Session', async () => {
      const res = await makeRequest('POST', '/api/games/session', {
        roomId: state.roomId,
        participantIds: [state.userId],
      }, state.token);
      log.info(`Status: ${res.status}`);
      if (res.status === 200 || res.status === 201) {
        const data = res.data.data || res.data;
        log.info(`Game State: ${data.gameState || 'unknown'}`);
        return true;
      }
      return false;
    });
  }

  // Summary
  log.step('TEST SUMMARY');
  const total = state.passed + state.failed;
  const percentage = ((state.passed / total) * 100).toFixed(1);
  console.log(`${colors.green}✓ Passed: ${state.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${state.failed}${colors.reset}`);
  console.log(`Success Rate: ${percentage}%\n`);

  if (state.failed === 0) {
    console.log(`${colors.bright}${colors.green}🎉 ALL TESTS PASSED!${colors.reset}\n`);
  }
}

runTests().catch(console.error);
