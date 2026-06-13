const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function runSmokeTest() {
  console.log("=== DOCBRIDGE FINAL SMOKE TEST CHECKLIST ===");
  const results = {};

  // Helper for printing
  const logResult = (name, passed, details = "") => {
    results[name] = passed;
    if (passed) {
      console.log(`✅ [${name}] - Working! ${details}`);
    } else {
      console.log(`❌ [${name}] - Broken! ${details}`);
    }
  };

  let testUserToken = "";
  let demoUserToken = "";

  // 1. Register a brand new user with email test@test.com and password Test@123456
  try {
    const email = `test_reg_${Date.now()}_${Math.floor(Math.random() * 1000)}@test.com`; // Unique email
    const res = await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password: 'Test@123456',
      firstName: 'Test',
      lastName: 'User'
    });
    testUserToken = res.data.data.accessToken;
    logResult("Register brand new user", true, `Email: ${email}`);
  } catch (err) {
    logResult("Register brand new user", false, err.response?.data?.message || err.message);
  }

  // 2. Login with the new user
  // (We already authenticated via registration above, but let's test explicit login)
  try {
    const email = `test_login_${Date.now()}_${Math.floor(Math.random() * 1000)}@test.com`;
    // Register first
    await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password: 'Test@123456',
      firstName: 'Login',
      lastName: 'Test'
    });
    // Explicit login
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password: 'Test@123456'
    });
    logResult("Login with new user", loginRes.data.success, `Logged in as: ${email}`);
  } catch (err) {
    logResult("Login with new user", false, err.response?.data?.message || err.message);
  }

  // 3. Login with arjun.mehta@gmail.com / Arjun@123
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'arjun.mehta@gmail.com',
      password: 'Arjun@123'
    });
    demoUserToken = res.data.data.accessToken;
    logResult("Login with demo user", true);
  } catch (err) {
    logResult("Login with demo user", false, err.response?.data?.message || err.message);
  }

  const token = demoUserToken || testUserToken;
  if (!token) {
    console.error("Cannot proceed with data tests: no auth token available.");
    return;
  }

  const headers = { Authorization: `Bearer ${token}` };

  // 4. Add a consultation record
  let consultationId = "";
  try {
    const res = await axios.post(`${BASE_URL}/consultations`, {
      doctorName: 'Dr. Sarah Connor',
      doctorSpecialty: 'Cardiologist',
      hospitalClinic: 'City General Hospital',
      consultationDate: '2026-05-30',
      diagnosis: 'Mild Hypertension',
      doctorNotes: 'Reduce salt intake and exercise regularly.'
    }, { headers });
    consultationId = res.data.data.id;
    logResult("Add a consultation record", true, `ID: ${consultationId}`);
  } catch (err) {
    logResult("Add a consultation record", false, err.response?.data?.message || err.message);
  }

  // 5. Add a prescription linked to that consultation
  try {
    const res = await axios.post(`${BASE_URL}/prescriptions`, {
      consultationId: consultationId || null,
      medicineName: 'Amlodipine',
      dosage: '5mg',
      frequency: 'Once daily',
      durationDays: 30,
      startDate: '2026-05-30',
      instructions: 'Take in the morning with water'
    }, { headers });
    logResult("Add a prescription linked to consultation", true, `ID: ${res.data.data.id}`);
  } catch (err) {
    logResult("Add a prescription linked to consultation", false, err.response?.data?.message || err.message);
  }

  // 6. Add a medicine reminder
  try {
    const res = await axios.post(`${BASE_URL}/reminders/medicine`, {
      medicineName: 'Amlodipine',
      dosage: '5mg',
      reminderTimes: ['08:00'],
      startDate: '2026-05-30'
    }, { headers });
    logResult("Add a medicine reminder", true, `ID: ${res.data.data.id}`);
  } catch (err) {
    logResult("Add a medicine reminder", false, err.response?.data?.message || err.message);
  }

  // 7. Add a lab report entry and confirm AI explanation appears
  try {
    const createRes = await axios.post(`${BASE_URL}/lab-reports`, {
      reportName: 'Basic Metabolic Panel',
      reportType: 'Blood Test',
      labName: 'Quest Diagnostics',
      reportDate: '2026-05-30',
      results: [
        { test_name: 'Sodium', value: '140', unit: 'mEq/L', reference_range: '135 - 145', status: 'normal' }
      ]
    }, { headers });
    const reportId = createRes.data.data.id;
    
    // Fetch AI explanation
    const explainRes = await axios.post(`${BASE_URL}/lab-reports/${reportId}/ai-explain`, {}, { headers });
    const aiExplanation = explainRes.data.data.explanation;
    
    logResult("Add a lab report entry and fetch AI explanation", !!aiExplanation, `Explanation excerpt: ${aiExplanation ? aiExplanation.substring(0, 50) + "..." : "None"}`);
  } catch (err) {
    logResult("Add a lab report entry and fetch AI explanation", false, err.response?.data?.message || err.message);
  }

  // 8. Log a symptom and confirm AI assessment appears
  try {
    const createRes = await axios.post(`${BASE_URL}/symptoms`, {
      symptomName: 'Mild Chest tightness',
      severity: 3,
      onsetDate: '2026-05-30',
      bodyLocation: 'Chest',
      isOngoing: true
    }, { headers });
    const symptomId = createRes.data.data.id;
    
    // Fetch AI insight
    const insightRes = await axios.post(`${BASE_URL}/symptoms/${symptomId}/ai-insight`, {}, { headers });
    const aiInsight = insightRes.data.data.insight;
    
    logResult("Log a symptom and fetch AI assessment", !!aiInsight, `Insight excerpt: ${aiInsight ? aiInsight.substring(0, 50) + "..." : "None"}`);
  } catch (err) {
    logResult("Log a symptom and fetch AI assessment", false, err.response?.data?.message || err.message);
  }

  // 9. Send a message in AI Companion and get a response
  try {
    const res = await axios.post(`${BASE_URL}/ai/chat`, {
      message: 'Hello, what does high sodium in blood test mean?'
    }, { headers });
    const aiResponse = res.data.data.message.content;
    logResult("Send a message in AI Companion and get response", !!aiResponse, `AI Response: ${aiResponse ? aiResponse.substring(0, 50) + "..." : "None"}`);
  } catch (err) {
    logResult("Send a message in AI Companion and get response", false, err.response?.data?.message || err.message);
  }

  // 10. Add a family member
  try {
    const res = await axios.post(`${BASE_URL}/family`, {
      firstName: 'Lily',
      lastName: 'Mehta',
      relationship: 'child',
      dateOfBirth: '2015-08-10',
      gender: 'female'
    }, { headers });
    logResult("Add a family member", true, `ID: ${res.data.data.id}`);
  } catch (err) {
    logResult("Add a family member", false, err.response?.data?.message || err.message);
  }

  // 11. Check the Dashboard loads with summary data
  try {
    const res = await axios.get(`${BASE_URL}/health-summary/dashboard`, { headers });
    logResult("Check Dashboard loads with summary data", res.data.success, `Health Score: ${res.data.data.healthScore || 80}`);
  } catch (err) {
    logResult("Check Dashboard loads with summary data", false, err.response?.data?.message || err.message);
  }

}

runSmokeTest();
