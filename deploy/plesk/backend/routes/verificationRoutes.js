const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/verificationController");

router.get("/stats", authMiddleware, controller.getVerificationStats);
router.get("/settings", authMiddleware, controller.getVerificationSettings);
router.patch(
  "/settings",
  authMiddleware,
  controller.updateVerificationSettings,
);
router.get("/filters/cities", authMiddleware, controller.getVerificationCities);
router.get("/users", authMiddleware, controller.getVerificationUsers);
router.post(
  "/users/:type/:id/action",
  authMiddleware,
  controller.manualBadgeAction,
);
router.get("/users/:type/:id", authMiddleware, controller.getBadgeProfile);

module.exports = router;
