const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminTeamController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/stats", authMiddleware, controller.getTeamStats);
router.get("/members", authMiddleware, controller.getTeamMembers);
router.post("/members", authMiddleware, controller.addTeamMember);
router.patch("/members/:id", authMiddleware, controller.updateTeamMember);
router.post("/members/:id/delete", authMiddleware, controller.deleteTeamMember);

module.exports = router;
