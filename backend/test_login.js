const axios = require('axios');

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/passenger/login', {
      phone: '+212600000001'
    });
    const token = loginRes.data.data.token;
    console.log('Got Token:', token);

    const completeRes = await axios.post('http://localhost:5000/api/passenger/complete-registration', {
      name: 'John Doe',
      email: 'john@example.com',
      dob: '1990-01-01',
      gender: 'MALE',
      cityId: 1
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Complete Registration Response:');
    console.log(JSON.stringify(completeRes.data, null, 2));

    const profileRes = await axios.get('http://localhost:5000/api/passenger/profile', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Profile Response:');
    console.log(JSON.stringify(profileRes.data, null, 2));

  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}

test();
