const pool = require("../db");

// ------------------------------------------------------------------
//  GET /claims  — all claims joined with their report info
// ------------------------------------------------------------------
exports.getClaims = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         c.id,
         c.description,
         c.image_url,
        c.image_url AS image,
         c.status,
         c.created_at,
         c.user_id,
         c.report_id,
         c.student_id,
         c.student_email,
         COALESCE(c.item_name, r.item_name) AS item_name,
         COALESCE(c.location,  r.location)  AS location,
         r.date_found,
         r.status AS report_status
       FROM claims c
       LEFT JOIN reports r ON c.report_id = r.id
       ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getClaims error:", err);
    res.status(500).json({ error: "Failed to fetch claims" });
  }
};

// ------------------------------------------------------------------
//  PUT /claims/:id  — update claim status (approved | rejected | pending)
// ------------------------------------------------------------------
exports.updateClaimStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["pending", "approved", "rejected"];
  const safeStatus = allowed.includes((status || "").toLowerCase())
    ? status.toLowerCase()
    : null;

  if (!safeStatus) {
    return res.status(400).json({ error: "Invalid status. Must be pending, approved, or rejected." });
  }

  try {
    // Fetch the claim first to get its report_id
    const claimResult = await pool.query(
      `SELECT * FROM claims WHERE id = $1`,
      [id]
    );
    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: "Claim not found" });
    }
    const claim = claimResult.rows[0];

    // If approving, check the linked report isn't already claimed
    if (safeStatus === "approved" && claim.report_id) {
      const reportResult = await pool.query(
        `SELECT claim_status FROM reports WHERE id = $1`,
        [claim.report_id]
      );
      if (reportResult.rows.length > 0 && reportResult.rows[0].claim_status === "claimed") {
        return res.status(409).json({ error: "This item has already been claimed." });
      }
    }

    // Update the claim status
    const updated = await pool.query(
      `UPDATE claims SET status = $1 WHERE id = $2 RETURNING *`,
      [safeStatus, id]
    );

    // If approved and claim has a linked report, mark the report as claimed
    if (safeStatus === "approved" && claim.report_id) {
      console.log("Updating report to claimed:", claim.report_id);
      await pool.query(
        `UPDATE reports SET claim_status = 'claimed' WHERE id = $1`,
        [claim.report_id]
      );
      console.log(`[updateClaimStatus] Report ${claim.report_id} marked as claimed`);
    } else if (safeStatus === "approved" && !claim.report_id) {
      console.warn(`[updateClaimStatus] Claim ${id} approved but has no report_id — reports table not updated`);
    }

    // If rejected, reports.claim_status is intentionally left unchanged

    console.log(`[updateClaimStatus] Claim ${id} → ${safeStatus}`);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error("updateClaimStatus error:", err);
    res.status(500).json({ error: "Failed to update claim status" });
  }
};

// ------------------------------------------------------------------
//  POST /claims  — submit a new claim
// ------------------------------------------------------------------
exports.createClaim = async (req, res) => {
  console.log("[createClaim] req.body:", req.body);

  const { report_id, student_id, student_email, item_name, location, description, user_id } = req.body;
  const uploadedImagePath = req.file ? `/uploads/${req.file.filename}` : null;

  // Server-side validation for all required fields
  if (!student_id || !String(student_id).trim()) {
    return res.status(400).json({ error: "student_id is required." });
  }
  if (!student_email || !String(student_email).trim()) {
    return res.status(400).json({ error: "student_email is required." });
  }
  if (!item_name || !String(item_name).trim()) {
    return res.status(400).json({ error: "item_name is required." });
  }
  if (!location || !String(location).trim()) {
    return res.status(400).json({ error: "location is required." });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ error: "Description is required." });
  }

  // Resolve report_id — accept numeric or null; reject non-numeric strings
  const resolvedReportId = report_id ? (Number.isInteger(Number(report_id)) ? Number(report_id) : null) : null;

  try {
    const resolvedImageUrl = uploadedImagePath || req.body.image_url || req.body.image || null;

    const result = await pool.query(
      `INSERT INTO claims (report_id, student_id, student_email, item_name, location, description, user_id, image_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
      [
        resolvedReportId,
        String(student_id).trim(),
        String(student_email).trim(),
        String(item_name).trim(),
        String(location).trim(),
        description.trim(),
        user_id   || null,
        resolvedImageUrl,
      ]
    );

    const row = result.rows[0];
    console.log(`[createClaim] Saved claim id: ${row.id} | report_id: ${row.report_id} | item_name: ${row.item_name}`);
    res.status(201).json({
      id:           row.id,
      reportId:     row.report_id,
      studentId:    row.student_id,
      studentEmail: row.student_email,
      itemName:     row.item_name,
      location:     row.location,
      description:  row.description,
      image:        row.image_url,
      imageUrl:     row.image_url,
      status:       row.status,
      createdAt:    row.created_at,
    });
  } catch (err) {
    console.error("createClaim error:", err);
    res.status(500).json({ error: "Failed to submit claim", detail: err.message });
  }
};
