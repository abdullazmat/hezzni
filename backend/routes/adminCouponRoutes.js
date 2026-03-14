const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminCouponController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/stats", controller.getStats);
router.get("/service-options", controller.getServiceOptions);
router.get("/", controller.listCoupons);
router.post("/", controller.createCoupon);
router.get("/:id", controller.getCouponDetail);
router.put("/:id", controller.updateCoupon);
router.delete("/:id", controller.deleteCoupon);

module.exports = router;
