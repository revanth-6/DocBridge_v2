const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/api/v1';
const CREDENTIALS = { email: 'arjun.mehta@gmail.com', password: 'Arjun@123' };

let token = '';
let userId = ''; // From auth

const results = [];

function logResult(service, operation, expected, actual, message = '') {
    const passed = expected === actual;
    results.push({
        Service: service,
        Operation: operation,
        Expected: expected,
        Actual: actual,
        Result: passed ? '✅ Pass' : '❌ Fail',
        Message: message
    });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${service} - ${operation}: Expected ${expected}, Got ${actual}. ${message}`);
}

async function authenticate() {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, CREDENTIALS);
        token = res.data.data.accessToken;
        // Decode token to get userId (simple split since we don't have jsonwebtoken installed here, or just grab from response if available)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.userId;
        console.log(`Authenticated successfully as ${userId}`);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return true;
    } catch (error) {
        console.error('Authentication failed:', error.response?.data || error.message);
        return false;
    }
}

async function runCrudAssault(serviceName, basePath, createPayload, updatePayload) {
    let createdId = null;
    let url = `${BASE_URL}${basePath}`;

    // 1. CREATE
    try {
        const res = await axios.post(url, createPayload);
        createdId = res.data.data.id;
        logResult(serviceName, 'CREATE', 201, res.status);
    } catch (error) {
        logResult(serviceName, 'CREATE', 201, error.response?.status || 500, error.response?.data?.message || error.message);
        return; // Stop here if create fails
    }

    // 2. READ ALL
    try {
        const res = await axios.get(url);
        logResult(serviceName, 'READ ALL', 200, res.status);
    } catch (error) {
        logResult(serviceName, 'READ ALL', 200, error.response?.status || 500);
    }

    // 3. READ SINGLE
    try {
        const res = await axios.get(`${url}/${createdId}`);
        logResult(serviceName, 'READ SINGLE', 200, res.status);
    } catch (error) {
        logResult(serviceName, 'READ SINGLE', 200, error.response?.status || 500);
    }

    // 4. UPDATE
    try {
        const res = await axios.put(`${url}/${createdId}`, updatePayload);
        logResult(serviceName, 'UPDATE', 200, res.status);
    } catch (error) {
        logResult(serviceName, 'UPDATE', 200, error.response?.status || 500);
    }

    // 5. DELETE
    try {
        const res = await axios.delete(`${url}/${createdId}`);
        logResult(serviceName, 'DELETE', 200, res.status);
    } catch (error) {
        logResult(serviceName, 'DELETE', 200, error.response?.status || 500);
    }

    // 6. READ DELETED
    try {
        const res = await axios.get(`${url}/${createdId}`);
        logResult(serviceName, 'READ DELETED', 404, res.status, 'Should not find deleted record');
    } catch (error) {
        logResult(serviceName, 'READ DELETED', 404, error.response?.status || 500);
    }

    // 7. DOUBLE DELETE
    try {
        const res = await axios.delete(`${url}/${createdId}`);
        logResult(serviceName, 'DOUBLE DELETE', 404, res.status, 'Should return 404, not 500');
    } catch (error) {
        logResult(serviceName, 'DOUBLE DELETE', 404, error.response?.status || 500);
    }

    // 8. UPDATE DELETED
    try {
        const res = await axios.put(`${url}/${createdId}`, updatePayload);
        logResult(serviceName, 'UPDATE DELETED', 404, res.status, 'Should return 404, not 500');
    } catch (error) {
        // Some APIs might return 400 for bad request if ID isn't found during update, we accept 404 or 400.
        const status = error.response?.status || 500;
        const passed = status === 404 || status === 400;
        logResult(serviceName, 'UPDATE DELETED', '404/400', status, passed ? '' : 'Expected 404 or 400');
    }
    
    // 9. RAPID CREATION (Race Condition / Duplicates)
    try {
        const promises = [
            axios.post(url, createPayload),
            axios.post(url, createPayload),
            axios.post(url, createPayload)
        ];
        const rapidRes = await Promise.allSettled(promises);
        
        let all500s = true;
        let successCount = 0;
        rapidRes.forEach(r => {
            if (r.status === 'fulfilled' && r.value.status === 201) successCount++;
            if (r.status === 'rejected' && r.reason.response?.status !== 500) all500s = false;
        });

        // Clean up any successfully created records from rapid test
        rapidRes.forEach(async (r) => {
             if(r.status === 'fulfilled' && r.value.data?.data?.id) {
                 await axios.delete(`${url}/${r.value.data.data.id}`).catch(()=>true);
             }
        });
        
        if (all500s && successCount === 0) {
           logResult(serviceName, 'RAPID CREATION', 'Handled gracefully', 500, 'All failed with 500 - crash risk');
        } else {
           logResult(serviceName, 'RAPID CREATION', 'Handled gracefully', successCount > 0 ? 201 : 'Mixed', `Created ${successCount} records. Handling was graceful.`);
        }

    } catch (error) {
        logResult(serviceName, 'RAPID CREATION', 'Handled gracefully', error.response?.status || 500);
    }
}


async function runPhase2() {
    console.log('--- STARTING PHASE 2: CRUD ASSAULT ---');
    if (!await authenticate()) return;

    // 1. Consultations
    await runCrudAssault(
        'Consultation', 
        '/consultations', 
        { doctorName: 'Dr. Strange', doctorSpecialty: 'Neurology', hospitalClinic: 'Kamar-Taj', consultationDate: '2026-06-01', diagnosis: 'Testing' },
        { diagnosis: 'Updated Testing' }
    );

    // 2. Prescriptions
    await runCrudAssault(
        'Prescription', 
        '/prescriptions', 
        { medicineName: 'Testamol', dosage: '500mg', frequency: 'Twice daily', durationDays: 5, startDate: '2026-06-01' },
        { dosage: '600mg' }
    );

    // 3. Reminders - Medicine
    // Need a valid prescription ID for medicine reminder, we will create one first
    let prescIdForReminder = null;
    try {
        const pRes = await axios.post(`${BASE_URL}/prescriptions`, { medicineName: 'ReminderMed', dosage: '10mg', frequency: 'Daily', durationDays: 1, startDate: '2026-06-01' });
        prescIdForReminder = pRes.data.data.id;
    } catch(e) { console.error("Failed to setup prescription for reminder test"); }

    if (prescIdForReminder) {
        await runCrudAssault(
            'Reminders - Medicine', 
            '/reminders/medicine', 
            { prescriptionId: prescIdForReminder, medicineName: 'ReminderMed', dosage: '10mg', reminderTimes: ['08:00'], startDate: '2026-06-01' },
            { isActive: true }
        );
        // cleanup presc
        await axios.delete(`${BASE_URL}/prescriptions/${prescIdForReminder}`).catch(()=>true);
    }

    // 4. Reminders - Follow-up
    await runCrudAssault(
        'Reminders - Follow-up', 
        '/reminders/followup', 
        { title: 'Blood Test', reminderDate: '2026-06-05', reminderTime: '09:00' },
        { title: 'Updated Blood Test' }
    );

    // 5. Lab Reports
    await runCrudAssault(
        'Lab Reports', 
        '/lab-reports', 
        { reportName: 'Hemoglobin Test', reportType: 'Blood Test', reportDate: '2026-06-01' },
        { status: 'final' }
    );

    // 6. Symptoms
    await runCrudAssault(
        'Symptoms', 
        '/symptoms', 
        { symptomName: 'Headache Test', severity: 3, onsetDate: '2026-06-01' },
        { severity: 5 }
    );

    // 7. Family Members
    await runCrudAssault(
        'Family Members', 
        '/family', 
        { firstName: 'John', lastName: 'Doe', relationship: 'sibling' },
        { notes: 'Updated notes' }
    );

    // Write results to JSON file to parse easily
    fs.writeFileSync('phase2-results.json', JSON.stringify(results, null, 2));
    
    // Display Markdown Table
    console.log('\n--- PHASE 2 RESULTS ---');
    console.log('| Service | Operation | Expected Status | Actual Status | Result | Message |');
    console.log('|---|---|---|---|---|---|');
    results.forEach(r => {
        console.log(`| ${r.Service} | ${r.Operation} | ${r.Expected} | ${r.Actual} | ${r.Result} | ${r.Message} |`);
    });
}

runPhase2();
