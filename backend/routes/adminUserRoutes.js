const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  getProfile,
  updateProfile,
  updateStatus,
  updateLanguage,
  getLoginHistory,
  getEmploymentDetails,
  updateEmploymentDetails,
} = require("../controllers/adminUserController");
const authMiddleware = require("../middleware/authMiddleware");
const { ensureUploadDir } = require("../config/uploadPaths");

const avatarUploadDir = ensureUploadDir("avatars");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `admin-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});

const upload = multer({ storage });

// All routes are protected
router.use(authMiddleware);

router.get("/profile", getProfile);
router.put("/profile", upload.single("avatar"), updateProfile);
router.put("/status", updateStatus);
router.put("/language", updateLanguage);
router.get("/login-history", getLoginHistory);
router.get("/employment-details", getEmploymentDetails);
router.put("/employment-details", updateEmploymentDetails);

module.exports = router;
