const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminServiceManagementController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/kpis", controller.getKpis);
router.get("/services", controller.getServices);
router.get("/services/:id", controller.getServiceDetail);
router.put("/services/:id", controller.updateService);
router.put("/services/:id/toggle", controller.toggleService);
router.get("/services/:id/charts/revenue", controller.getRevenueChart);
router.get("/services/:id/charts/growth", controller.getGrowthChart);

module.exports = router;
