const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/tripController");

router.get("/stats", authMiddleware, controller.getTripsStats);
router.get("/", authMiddleware, controller.getTrips);
router.get("/:tripId", authMiddleware, controller.getTripById);

module.exports = router;
