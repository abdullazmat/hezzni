const db = require('../config/db');

// Seed a test coupon
exports.seedCoupon = async (req, res) => {
  try {
    const code = 'TEST' + Math.floor(Math.random() * 10000);
    const discountAmount = 15.00;
    const usageLimit = 100;

    const [result] = await db.pool.execute(
      'INSERT INTO coupons (code, discount_amount, usage_limit, expiry_date) VALUES (?, ?, ?, ?)',
      [code, discountAmount, usageLimit, '2025-12-31 23:59:59']
    );

    res.status(201).json({
      status: 'success',
      message: 'Coupon created successfully',
      data: {
        id: result.insertId,
        code,
        discountAmount
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Validate a coupon code
exports.validateCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    const { price } = req.query;

    if (!code) {
      return res.status(400).json({ status: 'error', message: 'Coupon code is required' });
    }

    const [rows] = await db.pool.execute(
      "SELECT * FROM coupons WHERE code = ? AND status = 'active' AND (expiry_date IS NULL OR expiry_date > NOW())",
      [code]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Invalid or expired coupon code' });
    }

    const coupon = rows[0];
    if (coupon.current_usage >= coupon.usage_limit) {
      return res.status(400).json({ status: 'error', message: 'Coupon usage limit reached' });
    }

    const discountAmount = parseFloat(coupon.discount_amount);
    const originalPrice = parseFloat(price || 0);
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    res.json({
      status: 'success',
      message: 'Coupon validated successfully',
      data: {
        id: coupon.id,
        code: coupon.code,
        discountAmount,
        originalPrice,
        finalPrice
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};
