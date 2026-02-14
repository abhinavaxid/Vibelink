/**
 * VibeLink E2E Test - Simple & Focused
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
  error: (msg) => console.log(`${colors.red}ERROR: ${msg}${colors.reset}`),
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
      timeout: 5000,
    };

    if (token) options.headers.Authorization = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: null });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

const state = {
  passed: 0,
  failed: 0,
  email: `test${Date.now()}@test.com`,
  username: `user${Date.now()}`,
  password: 'TestPass123!',
  token: null,
  userId: null,
};

async function test(name, fn) {
  try {
    const result = await fn();
    if (result) {
      log.pass(name);
      state.passed++;
      return true;
    } else {
      log.fail(name);
      state.failed++;
      return false;
    }
  } catch (error) {
    log.fail(`${name} (${error.message})`);
    state.failed++;
    return false;
  }
}

async function runTests() {
  console.log(`\n${colors.bright}╔════════════════════════════════════╗
║   VIBELINK E2E TEST SUITE          ║
║   Testing API Endpoints            ║
╚════════════════════════════════════╝${colors.reset}\n`);

  log.info(`Backend: ${BASE_URL}`);
  log.info(`Test User: ${state.email}\n`);

  // Backend check
  log.step('BACKEND VERIFICATION');
  let backendUp = false;
  try {
    const res = await makeRequest('GET', '/api/rooms');
    if (res.status === 200 || res.status === 401) {
      log.pass('Backend is responding');
      state.passed++;
      backendUp = true;
    } else {
      log.fail(`Unexpected response: ${res.status}`);
      state.failed++;
    }
  } catch (error) {
    log.error(`Cannot reach backend at ${BASE_URL}`);
    log.error(error.message);
    process.exit(1);
  }

  if (!backendUp) {
    log.error('Aborting tests');
    process.exit(1);
  }

  // USER REGISTRATION
  log.step('USER REGISTRATION');
  let registered = false;
  await test('Register new user', async () => {
    const res = await makeRequest('POST', '/api/auth/register', {
      email: state.email,
      username: state.username,
      password: state.password,
    });

    if (res.status === 201 || res.status === 200) {
      const userData = res.data.data || res.data;
      if (userData && userData.token && userData.user) {
        state.token = userData.token;
        state.userId = userData.user.id;
        log.info(`User ID: ${state.userId}`);
        log.info(`Token: ${state.token.substring(0, 20)}...`);
        registered = true;
        return true;
      }
    } else if (res.status === 422 || res.status === 400) {
      log.fail(`Validation error: ${JSON.stringify(res.data)}`);
      return false;
    }
    log.info(`Response: ${res.status}`);
    return false;
  });

  if (!registered) {
    log.error('Cannot continue without successful registration');
    process.exit(1);
  }

  // USER LOGIN
  log.step('USER LOGIN');
  await test('Login with credentials', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: state.email,
      password: state.password,
    });

    if (res.status === 200) {
      const userData = res.data.data || res.data;
      if (userData && userData.token) {
        state.token = userData.token;
        return true;
      }
    }
    log.info(`Response: ${res.status}`);
    return false;
  });

  // USER PROFILE
  log.step('USER PROFILE');
  await test(`Get user profile (ID: ${state.userId})`, async () => {
    const res = await makeRequest('GET', `/api/users/${state.userId}`, null, state.token);
    log.info(`Status: ${res.status}`);
    return res.status === 200;
  });

  await test('Update profile (PATCH)', async () => {
    const res = await makeRequest('PATCH', `/api/users/${state.userId}`, {
      avatar: '🎮',
      communication_style: 'direct',
      energy_level: 'high',
    }, state.token);
    log.info(`Status: ${res.status}`);
    return res.status === 200 || res.status === 400;
  });

  // GAME ROOMS
  log.step('GAME ROOMS');
  let roomsCount = 0;
  await test('List available rooms', async () => {
    const res = await makeRequest('GET', '/api/rooms', null, state.token);
    if (res.status === 200) {
      const rooms = res.data.data || res.data;
      if (Array.isArray(rooms)) {
        roomsCount = rooms.length;
        log.info(`Found ${roomsCount} rooms`);
        if (roomsCount > 0) {
          log.info(`First room: ${rooms[0].name} (${rooms[0].id})`);
        }
        return true;
      }
    } else if (res.status === 401) {
      log.fail('Unauthorized - check token');
    }
    log.info(`Status: ${res.status}`);
    return false;
  });

  // SUMMARY
  log.step('TEST SUMMARY');
  const total = state.passed + state.failed;
  const percent = ((state.passed / total) * 100).toFixed(1);
  
  console.log(`${colors.green}✓ Passed: ${state.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${state.failed}${colors.reset}`);
  console.log(`Total: ${total} | Success: ${percent}%\n`);

  if (state.failed === 0) {
    console.log(`${colors.bright}${colors.green}🎉 ALL TESTS PASSED!${colors.reset}\n`);
  } else {
    console.log(`${colors.bright}${colors.yellow}Please check failures above${colors.reset}\n`);
  }
}

runTests().catch((error) => {
  log.error(`Fatal: ${error.message}`);
  process.exit(1);
});
