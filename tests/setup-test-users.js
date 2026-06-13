const axios = require('axios');

async function setup() {
  const users = [
    { email: 'regressionA@docbridge.health', name: 'UserA' },
    { email: 'regressionB@docbridge.health', name: 'UserB' }
  ];

  for (const u of users) {
    try {
      await axios.post('http://localhost:3000/api/v1/auth/register', {
        email: u.email,
        password: 'Password123!',
        firstName: u.name,
        lastName: 'Test',
        dateOfBirth: '1990-01-01',
        gender: 'other',
        phoneNumber: '9999999999',
        bloodGroup: 'O+'
      });
      console.log(`Registered ${u.email}`);
    } catch (err) {
      if (err.response && err.response.status === 409) {
        console.log(`${u.email} already exists.`);
      } else {
        console.error(`Error registering ${u.email}:`, err.response?.data || err.message);
      }
    }
    // sleep to avoid iat collisions
    await new Promise(r => setTimeout(r, 1000));
  }
}

setup();
