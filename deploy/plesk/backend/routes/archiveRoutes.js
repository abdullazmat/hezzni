const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/archiveController");

router.get("/stats", authMiddleware, controller.getArchiveStats);
router.get("/filters/cities", authMiddleware, controller.getArchiveCities);
router.get(
  "/filters/service-types",
  authMiddleware,
  controller.getArchiveServiceTypes,
);
router.get("/trips", authMiddleware, controller.getArchiveTrips);
router.get("/trips/:tripId", authMiddleware, controller.getArchiveTripById);

module.exports = router;
