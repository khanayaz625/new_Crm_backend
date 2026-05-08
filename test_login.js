const axios = require('axios');

const testLogin = async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@crm.com',
      password: 'adminpassword123'
    });
    console.log('Login successful:', res.data);
  } catch (err) {
    console.error('Test Login Failed:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
};

testLogin();
