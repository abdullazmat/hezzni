const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminSettingsController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/privacy-policy', authMiddleware, controller.getPrivacyPolicy);
router.get('/terms-of-service', authMiddleware, controller.getTermsOfService);

module.exports = router;
