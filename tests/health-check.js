const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function runHealthCheck() {
  console.log("=== DOCBRIDGE SERVICE HEALTH CHECK ===");
  let healthyCount = 0;
  const services = [
    { name: 'Gateway', method: 'GET', url: '/health', payload: null, useToken: false },
    { name: 'Auth', method: 'POST', url: '/api/v1/auth/login', payload: { email: 'arjun.mehta@gmail.com', password: 'Arjun@123' }, useToken: false },
    { name: 'Consultations', method: 'GET', url: '/api/v1/consultations', payload: null, useToken: true },
    { name: 'Prescriptions', method: 'GET', url: '/api/v1/prescriptions/active', payload: null, useToken: true },
    { name: 'Reminders', method: 'GET', url: '/api/v1/reminders/upcoming', payload: null, useToken: true },
    { name: 'Lab Reports', method: 'GET', url: '/api/v1/lab-reports', payload: null, useToken: true },
    { name: 'Symptoms', method: 'GET', url: '/api/v1/symptoms', payload: null, useToken: true },
    { name: 'Family', method: 'GET', url: '/api/v1/family', payload: null, useToken: true },
    { name: 'Dashboard', method: 'GET', url: '/api/v1/health-summary/dashboard', payload: null, useToken: true },
  ];

  let token = "";
  let authDuration = 0;
  let authError = null;

  // First, obtain the auth token to make subsequent requests
  const authStart = Date.now();
  try {
    const res = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      email: 'arjun.mehta@gmail.com',
      password: 'Arjun@123'
    });
    token = res.data?.data?.accessToken;
    authDuration = Date.now() - authStart;
  } catch (err) {
    authDuration = Date.now() - authStart;
    authError = err;
  }

  for (const s of services) {
    if (s.name === 'Auth') {
      if (token) {
        console.log(`✅ ${s.name.padEnd(16)} — 200 OK   (${authDuration}ms)`);
        healthyCount++;
      } else {
        const status = authError?.response?.status ? `${authError.response.status} ${authError.response.statusText || 'Error'}` : 'Offline';
        console.log(`❌ ${s.name.padEnd(16)} — ${status.padEnd(8)} (${authDuration}ms)`);
        if (authError?.response?.data) {
          console.log(`   └─ Details: ${JSON.stringify(authError.response.data)}`);
        }
      }
      continue;
    }

    const headers = {};
    if (s.useToken && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const start = Date.now();
    try {
      let res;
      const fullUrl = `${BASE_URL}${s.url}`;
      if (s.method === 'POST') {
        res = await axios.post(fullUrl, s.payload, { headers });
      } else {
        res = await axios.get(fullUrl, { headers });
      }
      const duration = Date.now() - start;
      console.log(`✅ ${s.name.padEnd(16)} — 200 OK   (${duration}ms)`);
      healthyCount++;
    } catch (err) {
      const duration = Date.now() - start;
      const status = err.response?.status ? `${err.response.status} ${err.response.statusText || 'Error'}` : 'Offline';
      console.log(`❌ ${s.name.padEnd(16)} — ${status.padEnd(8)} (${duration}ms)`);
      if (err.response?.data) {
        console.log(`   └─ Details: ${JSON.stringify(err.response.data)}`);
      }
    }
  }

  console.log("=====================================");
  console.log(`${healthyCount}/${services.length} services healthy`);
}

runHealthCheck();
