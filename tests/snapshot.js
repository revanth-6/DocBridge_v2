const axios = require('axios');
const fs = require('fs');

async function snapshot() {
  try {
    const res1 = await axios.post('http://localhost:3000/api/v1/auth/login', {email:'arjun.mehta@gmail.com',password:'Arjun@123'});
    const token = res1.data.data.accessToken;
    const config = { headers: { Authorization: 'Bearer '+token } };
    
    const dashboard = await axios.get('http://localhost:3000/api/v1/health-summary/dashboard', config);
    fs.writeFileSync('dashboard_snapshot.json', JSON.stringify(dashboard.data, null, 2));
    
    const timeline = await axios.get('http://localhost:3000/api/v1/health-summary/timeline', config);
    fs.writeFileSync('timeline_snapshot.json', JSON.stringify(timeline.data, null, 2));
    
    console.log('Snapshots saved.');
  } catch(e) {
    console.log('Error:', e.response?.status, e.response?.data || e.message);
  }
}
snapshot();
