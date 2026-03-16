const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminNotificationController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/stats", authMiddleware, controller.getStats);
router.get("/campaigns", authMiddleware, controller.getCampaigns);
router.post("/campaigns", authMiddleware, controller.createCampaign);
router.get("/team", authMiddleware, controller.getTeamNotifications);
router.post("/team", authMiddleware, controller.createTeamNotification);
router.get("/calculate-reach", authMiddleware, controller.calculateReach);
router.get("/filters/cities", authMiddleware, controller.getFilterCities);
router.get(
  "/filters/ride-preferences",
  authMiddleware,
  controller.getFilterRidePreferences,
);

module.exports = router;
