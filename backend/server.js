require("dotenv").config({ path: require("path").join(__dirname, ".env") });

console.log("🔥 BACKEND VERSION: NEW CODE RUNNING");
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");
const pool    = require("./db");

const reportRoutes  = require("./routes/reportRoutes");
const claimRoutes   = require("./routes/claimRoutes");
const authRoutes    = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use(cors());
app.use(express.json());
// Serve uploaded images as static files
app.use("/uploads", express.static(uploadsDir));

app.use("/reports",  reportRoutes);
app.use("/claims",   claimRoutes);
app.use("/auth",     authRoutes);
app.use("/messages", messageRoutes);

const PORT = process.env.PORT || 3001;

// Auto-create tables if they don't exist, then start listening
async function initDB() {
  try {
    // Verify DB connection before doing anything
    await pool.query("SELECT NOW()");
    console.log("✅ Connected to Supabase DB");

    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) UNIQUE NOT NULL,
        password   TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id          SERIAL PRIMARY KEY,
        item_name   TEXT NOT NULL,
        category    TEXT NOT NULL,
        location    TEXT NOT NULL,
        date_found  DATE,
        time_found  TEXT,
        name        TEXT,
        email       TEXT,
        phone       TEXT,
        description TEXT,
        status      TEXT DEFAULT 'Pending',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS claims (
        id          SERIAL PRIMARY KEY,
        report_id   INTEGER REFERENCES reports(id) ON DELETE SET NULL,
        user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        description TEXT,
        image_url   TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Migrate pre-existing claims table if needed
    const claimMigrations = [
      `ALTER TABLE claims ADD COLUMN IF NOT EXISTS report_id     INTEGER REFERENCES reports(id) ON DELETE SET NULL`,
      `ALTER TABLE claims ADD COLUMN IF NOT EXISTS user_id       INTEGER REFERENCES users(id)   ON DELETE SET NULL`,
      `ALTER TABLE claims ADD COLUMN IF NOT EXISTS image_url     TEXT`,
      `ALTER TABLE claims ADD COLUMN IF NOT EXISTS status        TEXT DEFAULT 'pending'`,
      `ALTER TABLE claims ADD COLUMN IF NOT EXISTS student_id    TEXT`,
      `ALTER TABLE claims ADD COLUMN IF NOT EXISTS student_email TEXT`,
      `ALTER TABLE claims ADD COLUMN IF NOT EXISTS item_name     TEXT`,
      `ALTER TABLE claims ADD COLUMN IF NOT EXISTS location      TEXT`,
      // Make report_id fully optional — claims are now standalone
      `ALTER TABLE claims ALTER COLUMN report_id DROP NOT NULL`,
    ];
    for (const sql of claimMigrations) {
      await pool.query(sql);
    }

    // Migration: add any columns that may be missing from pre-existing tables
    const reportMigrations = [
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS time_found    TEXT`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS name          TEXT`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS email         TEXT`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS phone         TEXT`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS description   TEXT`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS status        TEXT DEFAULT 'Pending'`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW()`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS claim_status  TEXT DEFAULT 'pending'`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS image_url     TEXT`,
    ];

    for (const sql of reportMigrations) {
      await pool.query(sql);
    }

    console.log("✅ DB tables verified and migrated");

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id    INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
        sender_type TEXT NOT NULL DEFAULT 'student',
        sender_role TEXT NOT NULL DEFAULT 'student',
        recipient_role TEXT NOT NULL DEFAULT 'admin',
        sender_id   TEXT NOT NULL DEFAULT '',
        message     TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const messageMigrations = [
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_role TEXT`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_role TEXT`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'student'`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id TEXT DEFAULT ''`,
      `UPDATE messages
       SET sender_role = COALESCE(NULLIF(sender_role, ''), NULLIF(sender_type, ''), 'student')
       WHERE sender_role IS NULL OR sender_role = ''`,
      `UPDATE messages
       SET recipient_role = CASE
         WHEN COALESCE(NULLIF(sender_role, ''), NULLIF(sender_type, ''), 'student') = 'admin' THEN 'student'
         ELSE 'admin'
       END
       WHERE recipient_role IS NULL OR recipient_role = ''`,
      `UPDATE messages SET sender_type = sender_role WHERE sender_type IS NULL OR sender_type = ''`,
      `ALTER TABLE messages ALTER COLUMN sender_role SET DEFAULT 'student'`,
      `ALTER TABLE messages ALTER COLUMN recipient_role SET DEFAULT 'admin'`,
    ];
    for (const sql of messageMigrations) {
      await pool.query(sql);
    }
    console.log("✅ messages table ready");
  } catch (err) {
    console.error("❌ DB init error:", err);
    process.exit(1);
  }
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
