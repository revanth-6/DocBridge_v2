const autocannon = require('autocannon');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const CREDENTIALS = { email: 'arjun.mehta@gmail.com', password: 'Arjun@123' };
let token = '';

const results = [];

function logResult(testName, concurrentUsers, duration, reqSec, avgLatency, p99Latency, errorRate, notes) {
    results.push({
        Test: testName,
        ConcurrentUsers: concurrentUsers,
        Duration: duration,
        'Req/sec': reqSec,
        'Avg Latency': avgLatency,
        'P99 Latency': p99Latency,
        'Error Rate': errorRate,
        Notes: notes
    });
    console.log(`[${testName}] Req/s: ${reqSec} | Avg Latency: ${avgLatency} | P99: ${p99Latency} | Errors: ${errorRate}`);
}

async function authenticate() {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, CREDENTIALS);
        token = res.data.data.accessToken;
    } catch (e) {
        console.error('Auth failed', e);
        process.exit(1);
    }
}

async function runAutocannon(opts, name) {
    return new Promise((resolve) => {
        const instance = autocannon(opts, (err, result) => {
            if (err) {
                console.error(`Error in ${name}:`, err);
                resolve(null);
            } else {
                resolve(result);
            }
        });
        
        autocannon.track(instance, { renderProgressBar: false });
    });
}

async function runPhase6() {
    console.log('\n--- PHASE 6: PERFORMANCE & STRESS TEST ---\n');
    await authenticate();
    const headers = { Authorization: `Bearer ${token}` };

    // 6A Baseline
    console.log('Running 6A: Baseline Performance...');
    const res6a = await runAutocannon({
        url: `${BASE_URL}/health-summary/dashboard`,
        connections: 50,
        duration: 15,
        headers
    }, '6A');
    if (res6a) {
        logResult('6A', 50, '15s', res6a.requests.average, res6a.latency.average, res6a.latency.p99, `${(res6a.non2xx / (res6a.requests.total || 1) * 100).toFixed(2)}%`, 'Dashboard read baseline');
    }

    // 6B Auth Hammer
    console.log('\nRunning 6B: Auth Endpoint Hammer...');
    const res6b = await runAutocannon({
        url: `${BASE_URL}/auth/login`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CREDENTIALS),
        connections: 100,
        duration: 15
    }, '6B');
    if (res6b) {
        logResult('6B', 100, '15s', res6b.requests.average, res6b.latency.average, res6b.latency.p99, `${(res6b.non2xx / (res6b.requests.total || 1) * 100).toFixed(2)}%`, `Auth Limiter caught ${res6b.non2xx} non-2xx reqs`);
    }

    // 6C Write-Heavy
    console.log('\nRunning 6C: Write-Heavy Stress Test...');
    const res6c = await runAutocannon({
        url: `${BASE_URL}/symptoms`,
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptomName: 'Stress', severity: 5, onsetDate: '2026-06-01' }),
        connections: 75,
        duration: 20
    }, '6C');
    if (res6c) {
        logResult('6C', 75, '20s', res6c.requests.average, res6c.latency.average, res6c.latency.p99, `${(res6c.non2xx / (res6c.requests.total || 1) * 100).toFixed(2)}%`, `500s: ${res6c.errors}`);
    }

    // 6D Oversized Payload Flood
    console.log('\nRunning 6D: Oversized Payload Flood...');
    const hugePayload = JSON.stringify({ consultationDate: '2026-06-01', doctorNotes: 'A'.repeat(2 * 1024 * 1024) });
    const res6d = await runAutocannon({
        url: `${BASE_URL}/consultations`,
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: hugePayload,
        connections: 20,
        duration: 10 // keeping it to 10s to not entirely kill the system before 6E
    }, '6D');
    if (res6d) {
        logResult('6D', 20, '10s', res6d.requests.average, res6d.latency.average, res6d.latency.p99, `${(res6d.non2xx / (res6d.requests.total || 1) * 100).toFixed(2)}%`, `High risk of OOM. Errors: ${res6d.errors}`);
    }

    // 6E Cascade Load
    console.log('\nRunning 6E: Cascade Load...');
    const optsDashboard = { url: `${BASE_URL}/health-summary/dashboard`, connections: 100, duration: 30, headers };
    const optsSymptoms = { url: `${BASE_URL}/symptoms`, method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ symptomName: 'Cascade', severity: 1, onsetDate: '2026-06-01' }), connections: 50, duration: 30 };
    
    const [resDash, resSymp] = await Promise.all([
        runAutocannon(optsDashboard, '6E-Dash'),
        runAutocannon(optsSymptoms, '6E-Symp')
    ]);

    if (resDash && resSymp) {
        const totalReq = resDash.requests.total + resSymp.requests.total;
        const totalNon2xx = resDash.non2xx + resSymp.non2xx;
        const errorRate = `${(totalNon2xx / (totalReq || 1) * 100).toFixed(2)}%`;
        logResult('6E', 150, '30s', (resDash.requests.average + resSymp.requests.average).toFixed(1), (resDash.latency.average + resSymp.latency.average)/2, Math.max(resDash.latency.p99, resSymp.latency.p99), errorRate, `Shared DB bottleneck check. Dash 500s: ${resDash.errors}, Symp 500s: ${resSymp.errors}`);
    }

    console.log('\n--- PHASE 6 RESULTS ---');
    console.table(results);
}

runPhase6();
