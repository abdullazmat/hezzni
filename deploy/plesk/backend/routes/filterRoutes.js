const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/filterController");

router.get("/cities", authMiddleware, controller.getCities);
router.get("/service-types", authMiddleware, controller.getServiceTypes);
router.get("/ride-preferences", authMiddleware, controller.getRidePreferences);

module.exports = router;
