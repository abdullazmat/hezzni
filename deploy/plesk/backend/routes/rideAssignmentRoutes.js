const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/rideAssignmentController");

router.get("/stats", authMiddleware, controller.getStats);
router.get("/preferences", authMiddleware, controller.getPreferences);
router.get(
  "/passenger-services",
  authMiddleware,
  controller.getPassengerServices,
);
router.get("/customers", authMiddleware, controller.searchCustomers);
router.get("/drivers", authMiddleware, controller.searchDrivers);
router.get("/cities", authMiddleware, controller.getCities);
router.get(
  "/waiting-customers",
  authMiddleware,
  controller.getWaitingCustomers,
);
router.get(
  "/available-drivers",
  authMiddleware,
  controller.getAvailableDrivers,
);
router.post("/assign", authMiddleware, controller.assignService);
router.get("/recent", authMiddleware, controller.getRecentAssignments);
router.get("/:tripId", authMiddleware, controller.getAssignmentDetail);
router.post("/:tripId/cancel", authMiddleware, controller.cancelAssignment);

module.exports = router;
