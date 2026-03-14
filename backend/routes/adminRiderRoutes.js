const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminRiderController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/stats", ctrl.getRiderStats);
router.get("/list", ctrl.getRiderList);
router.get("/detail/:id", ctrl.getRiderDetail);
router.post("/suspend/:id", ctrl.suspendRider);
router.post("/activate/:id", ctrl.activateRider);
router.put("/update/:id", ctrl.updateRider);
router.get("/spending/:id", ctrl.getRiderSpending);
router.get("/trips/:id", ctrl.getRiderTrips);

module.exports = router;
