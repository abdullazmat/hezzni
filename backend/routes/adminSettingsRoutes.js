const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminSettingsController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.get('/privacy-policy', authMiddleware, controller.getPrivacyPolicy);
router.get('/terms-of-service', authMiddleware, controller.getTermsOfService);
// If editing routes were added here, we'd use checkRole(["Admin"])
module.exports = router;
