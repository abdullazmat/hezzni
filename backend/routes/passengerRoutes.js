const express = require("express");
const router = express.Router();
const passengerController = require("../controllers/passengerController");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const { ensureUploadDir } = require("../config/uploadPaths");

const passengerUploadDir = ensureUploadDir("passengers");

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, passengerUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, "passenger-" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Public routes
router.post("/login", passengerController.login);
router.get("/cities", passengerController.getCities);

// Protected routes
router.post(
  "/complete-registration",
  authMiddleware,
  upload.single("image"),
  passengerController.completeRegistration,
);
router.get("/profile", authMiddleware, passengerController.getProfile);
router.put(
  "/profile",
  authMiddleware,
  upload.single("image"),
  passengerController.updateProfile,
);
router.get("/services", authMiddleware, passengerController.getServices);
router.post(
  "/calculate-ride-price",
  authMiddleware,
  passengerController.calculateRidePrice,
);

module.exports = router;
