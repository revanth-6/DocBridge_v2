const axios = require('axios');
async function test() {
  try {
    const res1 = await axios.post('http://localhost:3000/api/v1/auth/login', {email:'arjun.mehta@gmail.com',password:'Arjun@123'});
    const token = res1.data.data.accessToken;
    const res2 = await axios.post('http://localhost:3000/api/v1/consultations', 
      { consultationDate: '2026-06-01', doctorNotes: "<script>alert('xss')</script>Hello" },
      {headers:{Authorization:'Bearer '+token}}
    );
    console.log('Stored Data:', res2.data.data);
  } catch(e) {
    console.log('Error:', e.response?.data || e.message);
  }
}
test();
