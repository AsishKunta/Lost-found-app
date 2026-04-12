const express = require("express");
const router  = express.Router();

const { signup, login, getProfile } = require("../controllers/authController");

// POST /auth/signup
router.post("/signup", signup);

// POST /auth/login
router.post("/login", login);

// GET /auth/profile/:email
router.get("/profile/:email", getProfile);

module.exports = router;
