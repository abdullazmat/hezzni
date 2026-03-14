const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminRentalCompaniesController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/stats", ctrl.getStats);
router.get("/companies", ctrl.getCompanies);
router.get("/vehicles", ctrl.getVehicles);
router.get("/vehicles/:id", ctrl.getVehicleDetail);
router.put("/vehicles/:id/status", ctrl.updateVehicleStatus);

module.exports = router;
