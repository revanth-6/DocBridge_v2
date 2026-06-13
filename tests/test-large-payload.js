const axios = require('axios');
async function test() {
  try {
    const res1 = await axios.post('http://localhost:3000/api/v1/auth/login', {email:'arjun.mehta@gmail.com',password:'Arjun@123'});
    const token = res1.data.data.accessToken;
    
    // Create ~150KB payload (which exceeds 100KB)
    const largeString = 'A'.repeat(150 * 1024);
    
    const res2 = await axios.post('http://localhost:3000/api/v1/consultations', 
      { consultationDate: '2026-06-01', doctorNotes: largeString },
      {headers:{Authorization:'Bearer '+token}}
    );
    console.log('Success, which is bad:', res2.status);
  } catch(e) {
    console.log('Error Code:', e.response?.status, e.response?.data || e.message);
  }
}
test();
