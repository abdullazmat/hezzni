const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminDashboardController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/regions", authMiddleware, controller.getRegions);
router.get("/stats", authMiddleware, controller.getStats);
router.get("/trips-chart", authMiddleware, controller.getTripsChart);
router.get("/top-regions", authMiddleware, controller.getTopRegions);
router.get("/trips-by-region", authMiddleware, controller.getTripsByRegion);
router.get("/top-performers", authMiddleware, controller.getTopPerformers);

module.exports = router;
