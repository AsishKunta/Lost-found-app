const pool = require("../db");

function normalizeRole(role, fallback = "student") {
  return ["admin", "student"].includes(String(role || "").toLowerCase())
    ? String(role).toLowerCase()
    : fallback;
}

function normalizeMessageRow(row) {
  const senderRole = normalizeRole(row.sender_role || row.sender_type, "student");
  const recipientRole = normalizeRole(
    row.recipient_role || (senderRole === "admin" ? "student" : "admin"),
    senderRole === "admin" ? "student" : "admin"
  );

  return {
    id: row.id,
    claim_id: row.claim_id,
    sender_role: senderRole,
    recipient_role: recipientRole,
    message: row.message,
    created_at: row.created_at,
    sender_type: senderRole,
  };
}

// ------------------------------------------------------------------
//  GET /messages/:claim_id  — fetch all messages for a claim (ASC)
// ------------------------------------------------------------------
exports.getMessages = async (req, res) => {
  const { claim_id } = req.params;
  const viewer = normalizeRole(req.query.viewer, "student");
  if (!claim_id) return res.status(400).json({ error: "claim_id is required." });

  try {
    const result = await pool.query(
      `SELECT * FROM messages WHERE claim_id = $1 ORDER BY created_at ASC`,
      [parseInt(claim_id, 10)]
    );
    const normalized = (result.rows || []).map(normalizeMessageRow);
    console.log(
      `[messages.getMessages] viewer=${viewer} claim_id=${claim_id} loaded_count=${normalized.length}`
    );
    res.json(normalized);
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ error: "Failed to fetch messages." });
  }
};

// ------------------------------------------------------------------
//  GET /messages/conversations?role=admin|student&email=
// ------------------------------------------------------------------
exports.getConversations = async (req, res) => {
  const role = normalizeRole(req.query.role, "student");
  const email = String(req.query.email || "").trim().toLowerCase();
  const includeAllMessages = String(req.query.includeAllMessages || "").toLowerCase() === "true";

  try {
    const params = [];
    let whereSql = "";

    if (role === "student") {
      if (!email) {
        return res.status(400).json({ error: "email is required for student conversations." });
      }
      params.push(email);
      whereSql = "WHERE LOWER(COALESCE(c.student_email, '')) = $1";
    }

    const result = await pool.query(
      `SELECT
         m.id,
         m.claim_id,
         m.sender_role,
         m.recipient_role,
         m.sender_type,
         m.sender_id,
         m.message,
         m.created_at,
         c.item_name,
         c.student_email,
         c.student_id,
         c.location,
         c.status,
         c.created_at AS claim_created_at
       FROM messages m
       INNER JOIN claims c ON c.id = m.claim_id
       ${whereSql}
       ORDER BY m.created_at DESC`,
      params
    );

    const rows = result.rows || [];
    const groupedByClaim = new Map();

    rows.forEach((row) => {
      const claimId = row.claim_id;
      if (!groupedByClaim.has(claimId)) {
        groupedByClaim.set(claimId, {
          id: claimId,
          claim_id: claimId,
          item_name: row.item_name,
          student_email: row.student_email,
          student_id: row.student_id,
          location: row.location,
          status: row.status,
          created_at: row.claim_created_at,
          latest_message_preview: row.message,
          latest_timestamp: row.created_at,
          last_message_at: row.created_at,
          message_count: 0,
        });
      }

      const current = groupedByClaim.get(claimId);
      current.message_count += 1;
    });

    const conversations = Array.from(groupedByClaim.values()).sort((a, b) => {
      const ta = new Date(a.latest_timestamp || a.created_at || 0).getTime();
      const tb = new Date(b.latest_timestamp || b.created_at || 0).getTime();
      return tb - ta;
    });

    const normalizedMessages = rows.map((row) => ({
      ...normalizeMessageRow(row),
      item_name: row.item_name,
      student_email: row.student_email,
      student_id: row.student_id,
      status: row.status,
    }));

    console.log(
      `[messages.getConversations] role=${role}${email ? ` email=${email}` : ""} messages_loaded=${rows.length} grouped_conversations=${conversations.length}`
    );

    if (includeAllMessages) {
      return res.json({
        messages: normalizedMessages,
        conversations,
      });
    }

    res.json(conversations);
  } catch (err) {
    console.error("getConversations error:", err);
    res.status(500).json({ error: "Failed to fetch conversations." });
  }
};

// ------------------------------------------------------------------
//  POST /messages  — send a message
// ------------------------------------------------------------------
exports.createMessage = async (req, res) => {
  const {
    claim_id,
    sender_role,
    recipient_role,
    message,
    sender_type,
    sender_id,
  } = req.body;

  const parsedClaimId = parseInt(claim_id, 10);
  const safeSenderRole = normalizeRole(sender_role || sender_type, "student");
  const safeRecipientRole = normalizeRole(
    recipient_role,
    safeSenderRole === "admin" ? "student" : "admin"
  );

  const outgoingPayload = {
    claim_id: parsedClaimId,
    sender_role: safeSenderRole,
    recipient_role: safeRecipientRole,
    message: String(message || "").trim(),
    sender_id: String(sender_id || "").trim(),
  };

  console.log("[messages.createMessage] outgoing payload:", outgoingPayload);

  if (!parsedClaimId || Number.isNaN(parsedClaimId)) {
    return res.status(400).json({ error: "claim_id is required." });
  }
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "message cannot be empty." });
  }

  try {
    const claimCheck = await pool.query(`SELECT id FROM claims WHERE id = $1 LIMIT 1`, [parsedClaimId]);
    if (claimCheck.rows.length === 0) {
      return res.status(404).json({ error: "Claim not found for claim_id." });
    }

    const result = await pool.query(
      `INSERT INTO messages (claim_id, sender_role, recipient_role, sender_type, sender_id, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        parsedClaimId,
        safeSenderRole,
        safeRecipientRole,
        safeSenderRole,
        String(sender_id || "").trim(),
        String(message).trim(),
      ]
    );

    const saved = normalizeMessageRow(result.rows[0]);
    console.log("[messages.createMessage] saved record:", saved);
    res.status(201).json(saved);
  } catch (err) {
    console.error("createMessage error:", err);
    res.status(500).json({ error: "Failed to send message." });
  }
};
