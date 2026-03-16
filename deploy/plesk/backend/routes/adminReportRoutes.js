const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminReportController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/filters", authMiddleware, controller.getFilters);
router.get("/kpis", authMiddleware, controller.getKpis);
router.get(
  "/charts/service-volume",
  authMiddleware,
  controller.getServiceVolume,
);
router.get(
  "/charts/revenue-by-service",
  authMiddleware,
  controller.getRevenueByService,
);
router.get(
  "/charts/regional-performance",
  authMiddleware,
  controller.getRegionalPerformance,
);
router.get("/top-performers", authMiddleware, controller.getTopPerformers);
router.get("/regional-summary", authMiddleware, controller.getRegionalSummary);
router.get("/export", authMiddleware, controller.exportData);

module.exports = router;
