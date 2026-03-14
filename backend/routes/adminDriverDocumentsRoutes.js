const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminDriverDocumentsController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/stats", ctrl.getStats);
router.get("/list", ctrl.getList);
router.get("/detail/:type/:id", ctrl.getDetail);
router.put("/update-document-status/:type/:id", ctrl.updateDocumentStatus);
router.put(
  "/update-application-status/:type/:id",
  ctrl.updateApplicationStatus,
);
router.get("/categories/:driverId", ctrl.getCategories);
router.post("/assign-categories/:driverId", ctrl.assignCategories);

module.exports = router;
