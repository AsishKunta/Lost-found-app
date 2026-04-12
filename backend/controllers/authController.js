const pool   = require("../db");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

// ─── POST /auth/signup ────────────────────────────────────────────────────────
async function signup(req, res) {
  const { name, email, password } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  try {
    // Check for duplicate
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name.trim(), email.toLowerCase(), hashedPassword]
    );

    console.log("✅ Signup:", result.rows[0].email);
    return res.status(201).json({ message: "Account created successfully.", user: result.rows[0] });
  } catch (err) {
    console.error("❌ Signup error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    console.log("✅ Login:", user.email);
    return res.status(200).json({
      message: "Login successful.",
      user: {
        id:         user.id,
        name:       user.name,
        email:      user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

// ─── GET /auth/profile/:email ─────────────────────────────────────────────────
async function getProfile(req, res) {
  const { email } = req.params;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error("❌ Profile fetch error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = { signup, login, getProfile };
