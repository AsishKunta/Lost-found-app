const express = require("express");
const router = express.Router();

const {
  getReports,
  getReportById,
  createReport,
  updateReportStatus
} = require("../controllers/reportController");

router.get("/", getReports);
router.get("/:id", getReportById);
router.post("/", createReport);
router.patch("/:id", updateReportStatus);

module.exports = router;