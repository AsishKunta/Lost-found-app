const pool = require("../db");

exports.createClaim = async (req, res) => {
  const { studentId, studentEmail, description, image } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO claims (student_id, student_email, description, image)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [studentId || null, studentEmail || null, description || null, image || null]
    );

    const row = result.rows[0];
    res.status(201).json({
      id:           row.id,
      studentId:    row.student_id,
      studentEmail: row.student_email,
      description:  row.description,
      createdAt:    row.created_at
    });
  } catch (err) {
    console.error("createClaim error:", err);
    res.status(500).json({ error: "Failed to submit claim" });
  }
};