const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/reservationController");

router.get("/stats", authMiddleware, controller.getReservationStats);
router.get("/filters/cities", authMiddleware, controller.getReservationCities);
router.get(
  "/filters/service-types",
  authMiddleware,
  controller.getReservationServiceTypes,
);
router.get("/list", authMiddleware, controller.getReservationList);
router.get("/:id", authMiddleware, controller.getReservationDetail);

module.exports = router;
