const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/deliveryController");

router.get("/stats", authMiddleware, controller.getDeliveryStats);
router.get("/list", authMiddleware, controller.getDeliveryList);
router.get("/details/:id", authMiddleware, controller.getDeliveryDetail);
router.get("/top-drivers", authMiddleware, controller.getTopDrivers);
router.get("/top-riders", authMiddleware, controller.getTopRiders);

module.exports = router;
