const express = require("express");
const router = express.Router();
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

const {
  getClaims,
  createClaim,
  updateClaimStatus,
} = require("../controllers/claimController");

router.get("/",     getClaims);
router.post("/",    upload.single("image"), createClaim);
router.put("/:id",  updateClaimStatus);

module.exports = router;