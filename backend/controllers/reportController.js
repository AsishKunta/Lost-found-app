const pool = require("../db");

// Format a PostgreSQL DATE value to YYYY-MM-DD string
function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch (_) {
    return String(d).slice(0, 10);
  }
}

// Map a PostgreSQL row (snake_case) → camelCase for the frontend
function rowToReport(row) {
  return {
    id:          row.id,
    itemName:    row.item_name    || "",
    category:    row.category     || "",
    location:    row.location     || "",
    dateFound:   formatDate(row.date_found),
    timeFound:   row.time_found   || "",
    name:        row.name         || "",
    email:       row.email        || "",
    phone:       row.phone        || "",
    description: row.description  || "",
    status:      row.status       || "Pending",
    createdAt:   row.created_at
  };
}

exports.getReports = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM reports ORDER BY created_at DESC"
    );
    res.json(result.rows.map(rowToReport));
  } catch (err) {
    console.error("getReports error:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};

exports.getReportById = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM reports WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(rowToReport(result.rows[0]));
  } catch (err) {
    console.error("getReportById error:", err);
    res.status(500).json({ error: "Failed to fetch report" });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const { status } = req.body;
    // Only allow Pending or Claimed — never "matched" or anything else
    const safeStatus = status === "Claimed" ? "Claimed" : "Pending";
    const result = await pool.query(
      "UPDATE reports SET status = $1 WHERE id = $2 RETURNING *",
      [safeStatus, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(rowToReport(result.rows[0]));
  } catch (err) {
    console.error("updateReportStatus error:", err);
    res.status(500).json({ error: "Failed to update report" });
  }
};

exports.createReport = async (req, res) => {
  console.log("📥 API HIT - createReport", req.body);
  console.log("[createReport] Request body:", req.body);

  const {
    itemName,
    category,
    location,
    dateFound,
    timeFound,
    name,
    email,
    phone,
    description,
    status,
  } = req.body;

  if (!itemName || !itemName.trim() || !category || !location) {
    return res
      .status(400)
      .json({ error: "Item name, category, and location are required." });
  }

  // Map camelCase → snake_case, apply safe defaults for optional fields
  const values = [
    itemName.trim(),              // $1  item_name
    category.trim(),              // $2  category
    location.trim(),              // $3  location
    dateFound    || null,         // $4  date_found
    timeFound    || null,         // $5  time_found
    name         || null,         // $6  name
    email        || null,         // $7  email
    phone        || null,         // $8  phone
    description  || null,        // $9  description
    status       || "Pending",   // $10 status
  ];

  console.log("[createReport] Insert values:", values);

  try {
    const insertResult = await pool.query(
      `INSERT INTO reports
         (item_name, category, location, date_found, time_found, name, email, phone, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      values
    );

    const newReport = rowToReport(insertResult.rows[0]);
    console.log("[createReport] Report saved, id:", newReport.id);

    // Fetch all other reports for matching
    const allResult = await pool.query(
      "SELECT * FROM reports WHERE id <> $1 ORDER BY created_at DESC",
      [newReport.id]
    );
    const allReports = allResult.rows.map(rowToReport);

    console.log(`[matching] Comparing new report against ${allReports.length} existing report(s)`);

    // Tokenize string into meaningful words (length > 2, no stop words)
    const STOP_WORDS = new Set(["the", "and", "for", "with", "near", "this", "that", "from", "into"]);
    function tokenize(str) {
      if (!str || str === "N/A") return [];
      return str
        .toLowerCase()
        .split(/[\s,.\-_/]+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    }

    function wordOverlap(a, b) {
      const tokensA = tokenize(a);
      const tokensB = new Set(tokenize(b));
      return tokensA.some((w) => tokensB.has(w));
    }

    const newCategory    = (newReport.category    || "").toLowerCase().trim();
    const newLocation    = newReport.location    || "";
    const newName        = newReport.itemName    || "";
    const newDescription = newReport.description || "";
    const newDateFound   = newReport.dateFound   || "";

    const matches = allReports
      .reduce((acc, r) => {
        let score = 0;
        const breakdown = [];

        // Category exact match (+40)
        const rCategory = (r.category || "").toLowerCase().trim();
        if (rCategory && newCategory && rCategory === newCategory) {
          score += 40;
          breakdown.push("category +40");
        }

        // Location word overlap (+30) — uses tokenized word match, not substring
        if (wordOverlap(r.location, newLocation)) {
          score += 30;
          breakdown.push("location +30");
        }

        // Item name word overlap (+20)
        if (wordOverlap(r.itemName, newName)) {
          score += 20;
          breakdown.push("name +20");
        }

        // Description word overlap (+10)
        if (wordOverlap(r.description, newDescription)) {
          score += 10;
          breakdown.push("description +10");
        }

        // Date proximity: same date (+15), within 3 days (+5)
        const rDate = r.dateFound || "";
        if (rDate && newDateFound) {
          const diff = Math.abs(new Date(rDate) - new Date(newDateFound)) / (1000 * 60 * 60 * 24);
          if (diff === 0) {
            score += 15;
            breakdown.push("same date +15");
          } else if (diff <= 3) {
            score += 5;
            breakdown.push("near date +5");
          }
        }

        console.log(
          `[matching] id=${r.id} "${r.itemName}" | score=${score} | ${breakdown.join(", ") || "no matches"}`
        );

        // Threshold: >= 40 — category alone (40pts) is sufficient for a potential match
        if (score >= 40) acc.push({ ...r, matchScore: score });
        return acc;
      }, [])
      .sort((a, b) => b.matchScore - a.matchScore);

    console.log(`[matching] ${matches.length} match(es) found above threshold`);

    res.status(201).json({ report: newReport, matches });
  } catch (err) {
    console.error("[createReport] PostgreSQL error:", {
      message: err.message,
      code:    err.code,
      detail:  err.detail,
      hint:    err.hint,
      stack:   err.stack,
    });
    res.status(500).json({ error: "Failed to create report", detail: err.message, code: err.code });
  }
};