const axios = require('axios');
async function test() {
  try {
    const res1 = await axios.post('http://localhost:3000/api/v1/auth/login', {email:'arjun.mehta@gmail.com',password:'Arjun@123'});
    const token = res1.data.data.accessToken;
    const key = 'test-idemp-' + Date.now();
    const config = { headers: { Authorization: 'Bearer '+token, 'Idempotency-Key': key } };
    
    console.log('Sending 10 parallel identical POST requests with key:', key);
    const reqs = Array(10).fill(0).map(() => 
      axios.post('http://localhost:3000/api/v1/symptoms', { symptomName: 'Idempotent Test', severity: 2, onsetDate: '2026-06-01' }, config)
        .then(r => r.status)
        .catch(e => e.response?.status || e.message)
    );
    
    const results = await Promise.all(reqs);
    console.log('Results:', results);
  } catch(e) {
    console.log('Error:', e.message);
  }
}
test();
