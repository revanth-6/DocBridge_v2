const axios = require('axios');
async function test() {
  try {
    const res1 = await axios.post('http://localhost:3000/api/v1/auth/login', {email:'arjun.mehta@gmail.com',password:'Arjun@123'});
    const token = res1.data.data.accessToken;
    
    // 1. Create symptom
    const res2 = await axios.post('http://localhost:3000/api/v1/symptoms', 
      { symptomName: 'Headache', severity: 5, onsetDate: '2026-06-01' },
      {headers:{Authorization:'Bearer '+token}}
    );
    const id = res2.data.data.id;
    console.log('Created:', id);
    
    // 2. Delete it
    const res3 = await axios.delete('http://localhost:3000/api/v1/symptoms/'+id, {headers:{Authorization:'Bearer '+token}});
    console.log('First Delete Status:', res3.status);
    
    // 3. Delete again
    const res4 = await axios.delete('http://localhost:3000/api/v1/symptoms/'+id, {headers:{Authorization:'Bearer '+token}});
    console.log('Second Delete Status:', res4.status);
  } catch(e) {
    console.log('Error:', e.response?.status, e.response?.data || e.message);
  }
}
test();
