const axios = require('axios');

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/passenger/login', {
      phone: '+212600000001'
    });
    const token = loginRes.data.data.token;

    const priceRes = await axios.post('http://localhost:5000/api/passenger/calculate-ride-price', {
      pickup: { latitude: 33.5731, longitude: -7.5898, address: "Casa" },
      dropoff: { latitude: 33.5922, longitude: -7.6012, address: "Mall" },
      passengerServiceId: 1
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Price Without Coupon:');
    console.log(JSON.stringify(priceRes.data.data.options, null, 2));

    const priceWithCouponRes = await axios.post('http://localhost:5000/api/passenger/calculate-ride-price', {
      pickup: { latitude: 33.5731, longitude: -7.5898, address: "Casa" },
      dropoff: { latitude: 33.5922, longitude: -7.6012, address: "Mall" },
      passengerServiceId: 1,
      couponCode: 'HEZZNI2024'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Price With Coupon HEZZNI2024:');
    console.log(JSON.stringify(priceWithCouponRes.data.data.options, null, 2));

  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}

test();
