const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminReviewController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/stats", controller.getStats);
router.get("/", controller.listReviews);
router.get("/:id", controller.getReviewDetail);
router.put("/:id", controller.editReview);
router.delete("/:id", controller.deleteReview);
router.patch("/:id/toggle-visibility", controller.toggleVisibility);
router.patch("/:id/toggle-flag", controller.toggleFlag);

module.exports = router;
