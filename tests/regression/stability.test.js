// HOW TO ADD A NEW TEST:
// 1. Create an async function that performs the test logic.
// 2. Return an object { name: 'Test Name', passed: true/false, reason: 'Optional failure reason' }
// 3. Add the function to the `tests` array at the bottom of this file.
// 4. Run the suite to ensure it works.

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let validToken = '';

async function login() {
  try {
    const res = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      email: 'regressionA@docbridge.health',
      password: 'Password123!'
    });
    validToken = res.data.data.accessToken;
  } catch (err) {
    console.error('Failed to login for tests', err.message);
  }
}

async function testDoubleDelete() {
  try {
    // Create symptom
    const res = await axios.post(`${BASE_URL}/api/v1/symptoms`, {
      symptomName: 'Test Symptom',
      severity: 3,
      onsetDate: '2026-06-01'
    }, {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    const id = res.data.data.id;

    // Delete once
    await axios.delete(`${BASE_URL}/api/v1/symptoms/${id}`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    // Delete twice
    try {
      await axios.delete(`${BASE_URL}/api/v1/symptoms/${id}`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      return { name: 'Double DELETE', passed: false, reason: 'Second delete succeeded instead of 404' };
    } catch (err2) {
      if (err2.response && err2.response.status === 404) {
        return { name: 'Double DELETE', passed: true };
      }
      return { name: 'Double DELETE', passed: false, reason: `Expected 404, got ${err2.response?.status}` };
    }
  } catch (err) {
    return { name: 'Double DELETE', passed: false, reason: err.message };
  }
}

async function testDoublePostIdempotency() {
  try {
    const idempotencyKey = `idem-test-${Date.now()}`;
    const payload = {
      symptomName: 'Idempotency Symptom',
      severity: 3,
      onsetDate: '2026-06-01'
    };

    // First POST
    const res1 = await axios.post(`${BASE_URL}/api/v1/symptoms`, payload, {
      headers: { Authorization: `Bearer ${validToken}`, 'Idempotency-Key': idempotencyKey }
    });

    // Second POST with same key
    try {
      await axios.post(`${BASE_URL}/api/v1/symptoms`, payload, {
        headers: { Authorization: `Bearer ${validToken}`, 'Idempotency-Key': idempotencyKey }
      });
      return { name: 'Double POST Idempotency', passed: false, reason: 'Second POST succeeded instead of 409' };
    } catch (err) {
      if (err.response && err.response.status === 409) {
        // Clean up
        await axios.delete(`${BASE_URL}/api/v1/symptoms/${res1.data.data.id}`, {
          headers: { Authorization: `Bearer ${validToken}` }
        });
        return { name: 'Double POST Idempotency', passed: true };
      }
      return { name: 'Double POST Idempotency', passed: false, reason: `Expected 409, got ${err.response?.status}` };
    }
  } catch (err) {
    return { name: 'Double POST Idempotency', passed: false, reason: err.message };
  }
}

async function testHealthEndpointLatency() {
  try {
    const endpoints = [
      '/api/v1/consultations',
      '/api/v1/family',
      '/api/v1/lab-reports',
      '/api/v1/prescriptions',
      '/api/v1/reminders/upcoming',
      '/api/v1/symptoms'
    ];

    for (const endpoint of endpoints) {
      const start = Date.now();
      await axios.get(`${BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      const latency = Date.now() - start;
      if (latency > 2000) {
        return { name: 'Health Latency', passed: false, reason: `${endpoint} took ${latency}ms (expected <2000ms)` };
      }
    }
    return { name: 'Health Latency', passed: true };
  } catch (err) {
    return { name: 'Health Latency', passed: false, reason: err.message };
  }
}

async function testGatewayLatency() {
  try {
    const start = Date.now();
    await axios.get(`${BASE_URL}/api/v1/symptoms`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    const latency = Date.now() - start;
    if (latency > 500) {
      return { name: 'Gateway Latency', passed: false, reason: `Standard route took ${latency}ms (expected <500ms)` };
    }
    return { name: 'Gateway Latency', passed: true };
  } catch (err) {
    return { name: 'Gateway Latency', passed: false, reason: err.message };
  }
}

async function runAll() {
  await login();
  const tests = [
    testDoubleDelete,
    testDoublePostIdempotency,
    testHealthEndpointLatency,
    testGatewayLatency
  ];

  let passed = 0;
  const results = [];
  
  for (const test of tests) {
    const result = await test();
    if (result.passed) passed++;
    results.push(result);
  }

  return { name: 'stability.test.js', total: tests.length, passed, results };
}

if (require.main === module) {
  runAll().then(r => console.log(JSON.stringify(r, null, 2)));
}

module.exports = runAll;
