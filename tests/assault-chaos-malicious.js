const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/api/v1';
const CREDENTIALS = { email: 'arjun.mehta@gmail.com', password: 'Arjun@123' };

let token = '';
let userId = '';

const results = [];

function logResult(phase, operation, expected, actual, message = '') {
    const passed = (expected === actual) || (expected === 'FAIL' && actual !== 200 && actual !== 201) || (expected === '4XX' && actual >= 400 && actual < 500);
    results.push({
        Phase: phase,
        Operation: operation,
        Expected: expected,
        Actual: actual,
        Result: passed ? '✅ Pass' : '❌ Fail',
        Message: message
    });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${phase} - ${operation}: Expected ${expected}, Got ${actual}. ${message}`);
}

async function authenticate() {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, CREDENTIALS);
        token = res.data.data.accessToken;
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.userId;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return true;
    } catch (error) {
        console.error('Authentication failed:', error.message);
        return false;
    }
}

async function runPhase3CrossService() {
    console.log('\n--- PHASE 3: CROSS-SERVICE CHAOS ---');
    const p3 = 'Cross-Service';

    // 1. Create Consultation
    let consultId = null;
    try {
        const cRes = await axios.post(`${BASE_URL}/consultations`, { consultationDate: '2026-06-01' });
        consultId = cRes.data.data.id;
    } catch(e) { console.error("Setup failed"); return; }

    // 2. Create Prescription linked to Consultation
    let prescId = null;
    try {
        const pRes = await axios.post(`${BASE_URL}/prescriptions`, { consultationId: consultId, medicineName: 'LinkedMed', dosage: '10mg', frequency: 'Daily', startDate: '2026-06-01' });
        prescId = pRes.data.data.id;
        logResult(p3, 'Create Linked Prescription', 201, pRes.status);
    } catch(e) {
        logResult(p3, 'Create Linked Prescription', 201, e.response?.status || 500);
    }

    // 3. Delete Parent (Consultation)
    try {
        await axios.delete(`${BASE_URL}/consultations/${consultId}`);
        logResult(p3, 'Delete Parent Consultation', 200, 200);
    } catch(e) {
        logResult(p3, 'Delete Parent Consultation', 200, e.response?.status || 500);
    }

    // 4. Check Orphaned Prescription (Should it exist or cascade delete?)
    // In many medical systems, prescriptions persist even if the record of the visit is deleted, but we check if it throws 500
    try {
        const pCheck = await axios.get(`${BASE_URL}/prescriptions/${prescId}`);
        logResult(p3, 'Read Orphaned Prescription', 'Handles gracefully', pCheck.status, 'Record exists (no cascade delete)');
    } catch(e) {
        logResult(p3, 'Read Orphaned Prescription', 'Handles gracefully', e.response?.status || 500, 'Record was cascade deleted or errored');
    }

    // Cleanup
    if (prescId) await axios.delete(`${BASE_URL}/prescriptions/${prescId}`).catch(()=>true);
}

async function runPhase4Malicious() {
    console.log('\n--- PHASE 4: MALICIOUS & ADVERSARIAL ---');
    const p4 = 'Adversarial';

    // 1. SQL Injection Payload
    try {
        const res = await axios.post(`${BASE_URL}/consultations`, { consultationDate: '2026-06-01', diagnosis: "'; DROP TABLE users; --" });
        logResult(p4, 'SQL Injection (POST)', 'Handled (201 or 400)', res.status, 'Did not crash');
        if(res.data?.data?.id) await axios.delete(`${BASE_URL}/consultations/${res.data.data.id}`).catch(()=>true);
    } catch(e) {
        logResult(p4, 'SQL Injection (POST)', '4XX', e.response?.status || 500);
    }

    // 2. XSS Payload
    try {
        const res = await axios.post(`${BASE_URL}/consultations`, { consultationDate: '2026-06-01', doctorNotes: "<script>alert('xss')</script>" });
        logResult(p4, 'XSS Payload (POST)', 'Handled (201 or 400)', res.status, 'Stored safely or rejected');
        if(res.data?.data?.id) await axios.delete(`${BASE_URL}/consultations/${res.data.data.id}`).catch(()=>true);
    } catch(e) {
        logResult(p4, 'XSS Payload (POST)', '4XX', e.response?.status || 500);
    }

    // 3. JWT Tampering (Invalid Signature)
    try {
        const badToken = token.slice(0, -5) + 'xxxxx';
        const res = await axios.get(`${BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${badToken}` } });
        logResult(p4, 'Invalid JWT Signature', 401, res.status);
    } catch(e) {
        logResult(p4, 'Invalid JWT Signature', 401, e.response?.status || 500);
    }

    // 4. Missing Auth
    try {
        const res = await axios.get(`${BASE_URL}/auth/me`, { headers: { Authorization: '' } });
        logResult(p4, 'Missing Auth Header', 401, res.status);
    } catch(e) {
        logResult(p4, 'Missing Auth Header', 401, e.response?.status || 500);
    }

    // 5. Oversized Payload
    try {
        const giantString = 'A'.repeat(5 * 1024 * 1024); // 5MB string
        const res = await axios.post(`${BASE_URL}/consultations`, { consultationDate: '2026-06-01', doctorNotes: giantString });
        logResult(p4, 'Oversized Payload (5MB)', 413, res.status); // 413 Payload Too Large
    } catch(e) {
        // Express might throw 413 (Payload Too Large) or 400.
        const status = e.response?.status || 500;
        logResult(p4, 'Oversized Payload (5MB)', '413/400', status);
    }

    // 6. Overposting / Role Escalation
    try {
        // Attempting to change our role to 'admin' via profile update
        const res = await axios.put(`${BASE_URL}/auth/profile`, { role: 'admin' });
        // The role should either be ignored (200 but unchanged) or rejected (400)
        const check = await axios.get(`${BASE_URL}/auth/me`);
        const passed = check.data.data.role !== 'admin';
        logResult(p4, 'Role Escalation', 'Prevented', passed ? 'Prevented' : 'VULNERABLE', passed ? '' : 'CRITICAL: Role changed to admin');
    } catch(e) {
        logResult(p4, 'Role Escalation', '4XX', e.response?.status || 500, 'Update rejected');
    }

    // 7. Type Injection (Sending Array instead of String)
    try {
        const res = await axios.post(`${BASE_URL}/consultations`, { consultationDate: ['2026-06-01'] });
        logResult(p4, 'Type Injection (Array for String)', 400, res.status); // Zod should catch this and return 400
    } catch(e) {
        logResult(p4, 'Type Injection (Array for String)', '4XX', e.response?.status || 500);
    }
}

async function main() {
    if (!await authenticate()) return;
    await runPhase3CrossService();
    await runPhase4Malicious();

    fs.writeFileSync('phase3-4-results.json', JSON.stringify(results, null, 2));

    console.log('\n--- PHASE 3 & 4 RESULTS ---');
    console.log('| Phase | Operation | Expected Status | Actual Status | Result | Message |');
    console.log('|---|---|---|---|---|---|');
    results.forEach(r => {
        console.log(`| ${r.Phase} | ${r.Operation} | ${r.Expected} | ${r.Actual} | ${r.Result} | ${r.Message} |`);
    });
}

main();
