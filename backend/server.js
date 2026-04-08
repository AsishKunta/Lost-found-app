console.log("🔥 BACKEND VERSION: NEW CODE RUNNING");
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const reportRoutes = require("./routes/reportRoutes");
const claimRoutes = require("./routes/claimRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/reports", reportRoutes);
app.use("/claims", claimRoutes);

const PORT = process.env.PORT || 3001;

// Auto-create tables if they don't exist, then start listening
async function initDB() {
  try {
    // Create tables if they don't exist
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
        id            SERIAL PRIMARY KEY,
        student_id    TEXT,
        student_email TEXT,
        description   TEXT,
        image         TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Migration: add any columns that may be missing from pre-existing tables
    const reportMigrations = [
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS time_found  TEXT`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS name        TEXT`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS email       TEXT`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS phone       TEXT`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'Pending'`,
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW()`,
    ];

    for (const sql of reportMigrations) {
      await pool.query(sql);
    }

    console.log("✅ DB tables verified and migrated");
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
