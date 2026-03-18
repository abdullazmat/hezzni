const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminTeamController");
const authMiddleware = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");

router.get("/stats", authMiddleware, controller.getTeamStats);
router.get("/members", authMiddleware, controller.getTeamMembers);
router.post("/members", authMiddleware, checkRole(["Admin"]), controller.addTeamMember);
router.patch("/members/:id", authMiddleware, controller.updateTeamMember);
router.post("/members/:id/delete", authMiddleware, checkRole(["Admin"]), controller.deleteTeamMember);

module.exports = router;
