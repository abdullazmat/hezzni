const db = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Login or Register with phone number
exports.login = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ status: 'error', message: 'Phone number is required' });
    }

    // Check if user exists
    let [rows] = await db.pool.execute('SELECT * FROM riders WHERE phone = ?', [phone]);
    let user;
    let isRegistered = false;

    if (rows.length === 0) {
      // Create new user (Partial registration)
      const [result] = await db.pool.execute(
        'INSERT INTO riders (phone, name, email, is_registered) VALUES (?, ?, ?, ?)',
        [phone, '', '', false]
      );
      const [newUser] = await db.pool.execute('SELECT * FROM riders WHERE id = ?', [result.insertId]);
      user = newUser[0];
      isRegistered = false;
    } else {
      user = rows[0];
      isRegistered = !!user.is_registered;
    }

    // Generate Token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, isRegistered },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          imageUrl: user.image_url,
          dob: user.dob,
          gender: user.gender,
          cityId: user.city_id,
          isRegistered: !!user.is_registered,
          createdAt: user.joined_date
        },
        isRegistered: !!user.is_registered
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Complete registration
exports.completeRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, dob, gender, cityId } = req.body;
    const imageUrl = req.file ? `/uploads/passengers/${req.file.filename}` : null;

    const sql = `
      UPDATE riders 
      SET name = ?, email = ?, dob = ?, gender = ?, city_id = ?, image_url = COALESCE(?, image_url), is_registered = true 
      WHERE id = ?
    `;
    await db.pool.execute(sql, [name, email, dob, gender, cityId, imageUrl, userId]);

    const [rows] = await db.pool.execute('SELECT * FROM riders WHERE id = ?', [userId]);
    const user = rows[0];

    res.status(201).json({
      status: 'success',
      message: 'Profile completed successfully',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          imageUrl: user.image_url,
          dob: user.dob,
          gender: user.gender,
          cityId: user.city_id,
          isRegistered: !!user.is_registered,
          createdAt: user.joined_date
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.pool.execute('SELECT * FROM riders WHERE id = ?', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const user = rows[0];
    res.json({
      status: 'success',
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          imageUrl: user.image_url,
          dob: user.dob,
          gender: user.gender,
          cityId: user.city_id,
          isRegistered: !!user.is_registered,
          createdAt: user.joined_date
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, dob, gender, cityId } = req.body;
    const imageUrl = req.file ? `/uploads/passengers/${req.file.filename}` : null;

    const sql = `
      UPDATE riders 
      SET name = ?, email = ?, phone = ?, dob = ?, gender = ?, city_id = ?, image_url = COALESCE(?, image_url) 
      WHERE id = ?
    `;
    await db.pool.execute(sql, [name, email, phone, dob, gender, cityId, imageUrl, userId]);

    const [rows] = await db.pool.execute('SELECT * FROM riders WHERE id = ?', [userId]);
    const user = rows[0];

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          imageUrl: user.image_url,
          dob: user.dob,
          gender: user.gender,
          cityId: user.city_id,
          isRegistered: !!user.is_registered,
          createdAt: user.joined_date
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Get all passenger services
exports.getServices = async (req, res) => {
  try {
    const [services] = await db.pool.execute('SELECT * FROM passenger_services');
    res.json({
      status: 'success',
      message: 'Services retrieved successfully',
      data: services,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Calculate Price & Get Ride Options
exports.calculateRidePrice = async (req, res) => {
  try {
    const { pickup, dropoff, passengerServiceId, couponCode } = req.body;

    // 1. Get service details and preferences
    const [preferences] = await db.pool.execute(
      'SELECT * FROM ride_preferences WHERE passenger_service_id = ?',
      [passengerServiceId]
    );

    const [serviceRows] = await db.pool.execute(
      'SELECT * FROM passenger_services WHERE id = ?',
      [passengerServiceId]
    );

    if (serviceRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Service not found' });
    }

    // 2. Simulated Distance and Duration Calculation
    // In a real app, use Google Maps API or similar.
    const distanceKm = 5.2; // Simulated
    const durationMin = 15; // Simulated

    // 3. Base price calculation logic
    // price = base_price + (distance * per_km_rate)
    const perKmRate = 2.5;
    
    let options = preferences.map(pref => {
      let price = parseFloat(pref.base_price) + (distanceKm * perKmRate);
      return {
        id: pref.id,
        ridePreference: pref.name,
        ridePreferenceKey: pref.preference_key,
        description: pref.description,
        price: parseFloat(price.toFixed(2))
      };
    });

    // 4. Coupon logic
    let couponData = null;
    if (couponCode) {
      const [coupons] = await db.pool.execute(
        "SELECT * FROM coupons WHERE code = ? AND status = 'active' AND (expiry_date IS NULL OR expiry_date > NOW())",
        [couponCode]
      );

      if (coupons.length > 0) {
        const coupon = coupons[0];
        if (coupon.current_usage < coupon.usage_limit) {
          const discount = parseFloat(coupon.discount_amount);
          options = options.map(opt => ({
            ...opt,
            price: Math.max(0, parseFloat((opt.price - discount).toFixed(2)))
          }));
          couponData = {
            id: coupon.id,
            code: coupon.code,
            discountAmount: discount
          };
        } else {
          return res.status(400).json({ status: 'error', message: 'Coupon usage limit reached' });
        }
      } else {
        return res.status(404).json({ status: 'error', message: 'Invalid or expired coupon code' });
      }
    }

    res.json({
      status: 'success',
      message: 'Ride price calculated successfully',
      data: {
        passengerService: serviceRows[0],
        distance: distanceKm,
        estimatedDuration: durationMin,
        pickup,
        dropoff,
        options,
        coupon: couponData
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Get Cities
exports.getCities = async (req, res) => {
  try {
    const [cities] = await db.pool.execute("SELECT * FROM cities WHERE status = 'active'");
    res.json({
      status: 'success',
      message: 'Cities retrieved successfully',
      data: cities,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};
