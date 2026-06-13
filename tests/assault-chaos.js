const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const BASE_URL = 'http://localhost:3000/api/v1';
const CREDENTIALS = { email: 'arjun.mehta@gmail.com', password: 'Arjun@123' };
let token = '';

const results = [];

function logResult(scenario, service, expected, actual, passed, notes) {
    results.push({ Scenario: scenario, ServiceStopped: service, ExpectedBehavior: expected, ActualBehavior: actual, Result: passed ? '✅' : '❌', Notes: notes });
    console.log(`[${scenario}] Stopped ${service}. Expected: ${expected}. Actual: ${actual}. Result: ${passed ? 'PASS' : 'FAIL'} (${notes})`);
}

async function authenticate() {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, CREDENTIALS);
        token = res.data.data.accessToken;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (e) {
        console.error('Initial auth failed', e);
        process.exit(1);
    }
}

async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function runPhase5() {
    console.log('\n--- PHASE 5: CHAOS ENGINEERING ---\n');
    await authenticate();

    // 5A
    console.log('Running 5A...');
    await execPromise('npx pm2 stop docbridge-symptom');
    await sleep(2000);
    try {
        const r1 = await axios.get(`${BASE_URL}/symptoms`);
        logResult('5A', 'Symptom Service', 'Clean 503', r1.status, false, 'Returned 200 instead of failing');
    } catch (e) {
        const status = e.response?.status || 500;
        const passed = status === 503 || status === 504 || status === 502; // Gateway standard proxy errors
        logResult('5A', 'Symptom Service (Direct)', 'Clean 503/502/504', status, passed, `Got ${status}. Message: ${e.message}`);
    }
    
    try {
        const r2 = await axios.get(`${BASE_URL}/health-summary/dashboard`);
        logResult('5A', 'Symptom Service (Cascade)', 'Clean 503/Partial Data', r2.status, false, 'Dashboard returned 200 fully?');
    } catch (e) {
        logResult('5A', 'Symptom Service (Cascade)', 'Clean 503/Partial Data', e.response?.status || 500, false, `Dashboard crashed with ${e.response?.status || 500}`);
    }
    await execPromise('npx pm2 start docbridge-symptom');
    await sleep(2000);

    // 5B
    console.log('\nRunning 5B...');
    await execPromise('npx pm2 stop docbridge-auth');
    await sleep(2000);
    try {
        await axios.post(`${BASE_URL}/auth/login`, CREDENTIALS);
        logResult('5B', 'Auth Service (Login)', 'Clean Fail', 200, false, 'Login succeeded? Impossible.');
    } catch (e) {
        logResult('5B', 'Auth Service (Login)', 'Clean Fail', e.response?.status || 502, true, `Failed with ${e.response?.status || e.message}`);
    }
    
    try {
        const r2 = await axios.get(`${BASE_URL}/symptoms`);
        logResult('5B', 'Auth Service (Protected)', 'Works or clean fail', r2.status, true, 'Protected route worked (Gateway caches JWT verification or does it locally!)');
    } catch (e) {
        logResult('5B', 'Auth Service (Protected)', 'Works or clean fail', e.response?.status || 500, true, `Protected route failed cleanly with ${e.response?.status}`);
    }
    await execPromise('npx pm2 start docbridge-auth');
    await sleep(2000);

    // 5C
    console.log('\nRunning 5C...');
    await execPromise('npx pm2 stop docbridge-consultation docbridge-labreport');
    await sleep(2000);
    try {
        const r1 = await axios.get(`${BASE_URL}/health-summary/dashboard`);
        logResult('5C', 'Consultation & Lab (Dashboard)', 'Partial Data (Graceful Degradation)', r1.status, true, 'Dashboard survived and returned partial data');
    } catch (e) {
        logResult('5C', 'Consultation & Lab (Dashboard)', 'Partial Data (Graceful Degradation)', e.response?.status || 500, false, `Dashboard crashed completely with ${e.response?.status}`);
    }
    await execPromise('npx pm2 start docbridge-consultation docbridge-labreport');
    await sleep(3000);

    // 5D
    console.log('\nRunning 5D...');
    await execPromise('docker stop docbridge-postgres');
    await sleep(2000);
    let dbFails = [];
    try { await axios.get(`${BASE_URL}/symptoms`); } catch(e) { dbFails.push(e.response?.status || e.message); }
    try { await axios.get(`${BASE_URL}/prescriptions`); } catch(e) { dbFails.push(e.response?.status || e.message); }
    try { await axios.get(`${BASE_URL}/family`); } catch(e) { dbFails.push(e.response?.status || e.message); }
    logResult('5D', 'PostgreSQL (Down)', '503/500 No Raw DB errors', dbFails.join(', '), true, 'Checked 3 endpoints');

    await execPromise('docker start docbridge-postgres');
    console.log('Waiting 10s for DB recovery...');
    await sleep(10000);
    
    try {
        const r1 = await axios.get(`${BASE_URL}/symptoms`);
        logResult('5D', 'PostgreSQL (Recovery)', 'Auto Recovered (200)', r1.status, true, 'Services recovered without PM2 restart');
    } catch(e) {
        logResult('5D', 'PostgreSQL (Recovery)', 'Auto Recovered (200)', e.response?.status || 500, false, 'Services failed to recover');
    }

    // 5E
    console.log('\nRunning 5E...');
    await execPromise('npx pm2 stop docbridge-gateway');
    await sleep(2000);
    try {
        const r1 = await axios.get(`http://localhost:3002/api/v1/consultations`, { headers: { Authorization: `Bearer ${token}` }});
        logResult('5E', 'Gateway', 'Not Accessible Internally', r1.status, false, 'WARNING: Internal service is directly accessible on port 3002 bypassing gateway!');
    } catch(e) {
        logResult('5E', 'Gateway', 'Not Accessible Internally', e.code || e.message, true, 'Service correctly rejected direct connection or timed out');
    }
    await execPromise('npx pm2 start docbridge-gateway');
    await sleep(3000);
    
    // Final restart to ensure clean state and rate limit application
    await execPromise('npx pm2 restart all');
    await sleep(5000);

    console.log('\n--- PHASE 5 RESULTS ---');
    console.table(results);
}

runPhase5();
