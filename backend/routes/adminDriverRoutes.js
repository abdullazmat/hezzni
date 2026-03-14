const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminDriverController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/stats", ctrl.getDriverStats);
router.get("/list", ctrl.getDriverList);
router.get("/detail/:id", ctrl.getDriverDetail);
router.post("/suspend/:id", ctrl.suspendDriver);
router.post("/activate/:id", ctrl.activateDriver);
router.put("/update/:id", ctrl.updateDriver);
router.get("/earnings/:id", ctrl.getDriverEarnings);
router.get("/trips/:id", ctrl.getDriverTrips);
router.get("/preferences", ctrl.getDriverPreferences);
router.post("/update-preferences/:id", ctrl.updateDriverPreferences);

module.exports = router;
