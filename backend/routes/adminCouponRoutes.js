const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminCouponController");
const authMiddleware = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get("/stats", controller.getStats);
router.get("/service-options", controller.getServiceOptions);
router.get("/", controller.listCoupons);
router.post("/", checkRole(["Admin", "Manager"]), controller.createCoupon);
router.get("/:id", controller.getCouponDetail);
router.put("/:id", checkRole(["Admin", "Manager"]), controller.updateCoupon);
router.delete("/:id", checkRole(["Admin"]), controller.deleteCoupon);

module.exports = router;
