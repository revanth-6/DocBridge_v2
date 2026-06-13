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

async function testFullCrudLifecycle() {
  try {
    // CREATE
    const res1 = await axios.post(`${BASE_URL}/api/v1/symptoms`, {
      symptomName: 'CRUD Test Symptom',
      severity: 3,
      onsetDate: '2026-06-01'
    }, {
      headers: { Authorization: `Bearer ${validToken}`, 'Idempotency-Key': `crud-test-${Date.now()}` }
    });
    const id = res1.data.data.id;

    if (res1.status !== 201) return { name: 'CRUD Lifecycle', passed: false, reason: 'CREATE failed' };

    // READ
    const res2 = await axios.get(`${BASE_URL}/api/v1/symptoms/${id}`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    if (res2.status !== 200) return { name: 'CRUD Lifecycle', passed: false, reason: 'READ failed' };

    // UPDATE
    const res3 = await axios.put(`${BASE_URL}/api/v1/symptoms/${id}`, {
      status: 'resolved'
    }, {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    if (res3.status !== 200) return { name: 'CRUD Lifecycle', passed: false, reason: 'UPDATE failed' };

    // DELETE
    const res4 = await axios.delete(`${BASE_URL}/api/v1/symptoms/${id}`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    if (res4.status !== 200) return { name: 'CRUD Lifecycle', passed: false, reason: 'DELETE failed' };

    return { name: 'CRUD Lifecycle', passed: true };
  } catch (err) {
    return { name: 'CRUD Lifecycle', passed: false, reason: err.message };
  }
}

async function testZodValidationErrors() {
  try {
    await axios.post(`${BASE_URL}/api/v1/symptoms`, {
      symptomName: 12345, // Invalid type
      severity: 3,
      onsetDate: '2026-06-01'
    }, {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    return { name: 'Zod Validation', passed: false, reason: 'Request succeeded with invalid type' };
  } catch (err) {
    if (err.response && err.response.status === 422) {
      return { name: 'Zod Validation', passed: true };
    }
    return { name: 'Zod Validation', passed: false, reason: `Expected 422, got ${err.response?.status}` };
  }
}

async function runAll() {
  await login();
  const tests = [
    testFullCrudLifecycle,
    testZodValidationErrors
  ];

  let passed = 0;
  const results = [];
  
  for (const test of tests) {
    const result = await test();
    if (result.passed) passed++;
    results.push(result);
  }

  return { name: 'crud.test.js', total: tests.length, passed, results };
}

if (require.main === module) {
  runAll().then(r => console.log(JSON.stringify(r, null, 2)));
}

module.exports = runAll;
