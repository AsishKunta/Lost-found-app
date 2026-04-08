const express = require("express");
const router = express.Router();

const { createClaim } = require("../controllers/claimController");

router.post("/", createClaim);

module.exports = router;