const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middleware/authMiddleware");
const adminUserController = require("../controllers/adminUserController");
const authController = require("../controllers/authController");

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/avatars/"),
  filename: (req, file, cb) =>
    cb(
      null,
      `admin-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`,
    ),
});
const upload = multer({ storage });

router.use(authMiddleware);

router.get("/", adminUserController.getProfile);
router.patch("/", upload.single("avatar"), adminUserController.updateProfile);
router.post("/change-password", authController.changePassword);
router.post("/logout", authController.logout);

module.exports = router;
