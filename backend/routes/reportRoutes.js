const express = require("express");
const router  = express.Router();
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || ".png"}`);
  },
});

const upload = multer({ storage });

// Images are now uploaded directly to Supabase Storage from the frontend.
// The backend receives only JSON with an image_url string — no file handling needed.
const {
  getReports,
  getReportById,
  createReport,
  updateReportStatus
} = require("../controllers/reportController");

router.get("/",      getReports);
router.get("/:id",   getReportById);
router.post("/",     upload.single("image"), createReport);
router.patch("/:id", updateReportStatus);

module.exports = router;