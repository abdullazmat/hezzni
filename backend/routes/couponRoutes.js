const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

// Routes
router.post('/seed', couponController.seedCoupon);
router.get('/validate/:code', couponController.validateCoupon);

module.exports = router;
