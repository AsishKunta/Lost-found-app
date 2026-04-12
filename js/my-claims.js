// =============================================================
//  my-claims.js — student's personal claims + chat
// =============================================================

// ---------------------------------------------------------
//  Helpers
// ---------------------------------------------------------

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function capitalize(str) {
  if (!str) return "Pending";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ---------------------------------------------------------
//  Resolve logged-in student email
// ---------------------------------------------------------

function getStudentEmail() {
  try {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    if (user?.email) return user.email.toLowerCase();
  } catch (_) {}
  const session = localStorage.getItem("sessionEmail");
  if (session) return session.toLowerCase();
  return null;
}

// ---------------------------------------------------------
//  State
// ---------------------------------------------------------

let _allClaims      = [];
let _currentClaimId = null;
let _studentEmail   = null;
let _msgChannel     = null;

// ─── Supabase client ─────────────────────────────────────
const _SB_URL = "https://whfxsantpzrltkjucscp.supabase.co";
const _SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZnhzYW50cHpybHRranVjc2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTI2ODgsImV4cCI6MjA5MTMyODY4OH0.NzT3RxpZRO6BDul06_gFg4GvNyH4NGB6l8L_Lld-ZYM";
const _sb = window.supabase.createClient(_SB_URL, _SB_KEY);
// ─────────────────────────────────────────────────────────

// ---------------------------------------------------------
//  Render the claims list
// ---------------------------------------------------------

function renderClaims(claims) {
  const container = document.getElementById("claimsList");
  container.innerHTML = "";

  if (!claims || claims.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>You haven't submitted any claims yet.</p>
      </div>`;
    return;
  }

  claims.forEach((claim) => {
    const card = document.createElement("div");
    card.className = "my-claim-card";

    const status = (claim.status || "pending").toLowerCase();
    const itemName = claim.item_name || "Unknown Item";
    const location = claim.location  || "—";
    const date     = formatDate(claim.created_at);

    card.innerHTML = `
      <h3>${escapeHtml(itemName)}</h3>
      <div class="card-meta">
        <span><i class="fas fa-map-marker-alt" style="color:#1e5faf;margin-right:4px;"></i>${escapeHtml(location)}</span>
        <span><i class="fas fa-calendar-alt" style="color:#1e5faf;margin-right:4px;"></i>${date}</span>
        <span class="card-status ${status}">${capitalize(status)}</span>
      </div>
    `;

    card.addEventListener("click", () => openModal(claim));
    container.appendChild(card);
  });
}

// ---------------------------------------------------------
//  Load claims from backend, filter by student email
// ---------------------------------------------------------

async function loadClaims() {
  const container = document.getElementById("claimsList");
  container.innerHTML = `<p style="text-align:center;color:#888;">Loading…</p>`;

  try {
    const res = await fetch(`${BASE_URL}/claims`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const all = await res.json();

    // Filter to only this student's claims
    if (_studentEmail) {
      _allClaims = all.filter(c =>
        (c.student_email || "").toLowerCase() === _studentEmail
      );
    } else {
      _allClaims = all; // fallback: show all if no email found
    }

    renderClaims(_allClaims);
  } catch (err) {
    console.error("loadClaims error:", err);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to load claims. Is the backend running?</p>
      </div>`;
  }
}

// ---------------------------------------------------------
//  Open claim detail modal
// ---------------------------------------------------------

function openModal(claim) {
  _currentClaimId = claim.id;

  const imgSrc    = claim.image_url || "";
  const itemName  = claim.item_name || "Unknown Item";
  const studentId = claim.student_id || "";
  const location  = claim.location || "";
  const status    = claim.status   || "pending";

  // Image
  const imgWrap = document.getElementById("mcImgWrap");
  if (imgSrc) {
    imgWrap.innerHTML = `
      <div class="mc-img-wrap">
        <img src="${escapeHtml(imgSrc)}" class="mc-img" alt="Claim image" />
      </div>`;
  } else {
    imgWrap.innerHTML = `
      <div class="mc-img-placeholder">
        <i class="fas fa-image" style="font-size:2rem;margin-right:8px;"></i>No image
      </div>`;
  }

  document.getElementById("mcTitle").textContent = itemName;
  document.getElementById("mcDetails").innerHTML = `
    <strong>Claim ID:</strong> #${escapeHtml(String(claim.id))}<br>
    <strong>Status:</strong> ${capitalize(status)}<br>
    ${studentId ? `<strong>Student ID:</strong> ${escapeHtml(String(studentId))}<br>` : ""}
    ${location  ? `<strong>Location:</strong> ${escapeHtml(location)}<br>` : ""}
    ${claim.created_at ? `<strong>Submitted:</strong> ${formatDate(claim.created_at)}<br>` : ""}
    <br>
    <strong>Description:</strong> ${escapeHtml(claim.description || "No description")}
  `;

  document.getElementById("mcOverlay").classList.add("open");

  // Clear previous messages and load fresh
  document.getElementById("chatBox").innerHTML = "";
  loadMessages(claim.id);
}

function closeModal() {
  document.getElementById("mcOverlay").classList.remove("open");
  _currentClaimId = null;
  // Tear down real-time subscription
  if (_msgChannel) { _sb.removeChannel(_msgChannel); _msgChannel = null; }
}

// ---------------------------------------------------------
//  Load messages for a claim  (Supabase direct + real-time)
// ---------------------------------------------------------

async function loadMessages(claimId) {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;
  chatBox.innerHTML = `<p style="color:#aaa;font-size:13px;text-align:center;">Loading…</p>`;

  console.log("[my-claims loadMessages] Fetching for claim_id:", claimId);

  const { data, error } = await _sb
    .from("messages")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: true });

  console.log("[my-claims loadMessages] Result — rows:", data?.length ?? 0, " error:", error);

  if (error) {
    console.error("[my-claims loadMessages] FETCH FAILED:", error.message, "code:", error.code);
    chatBox.innerHTML = `<p style="color:#ef4444;font-size:13px;text-align:center;">Failed to load messages. Check console.</p>`;
    return;
  }

  renderMessages(data || []);
  subscribeToMessages(claimId);
}

function messageBubble(m) {
  // Own messages = right/blue; other side = left/gray (role-aware)
  const user  = getCurrentUser();
  const isOwn = m.sender_type === user.role;
  const side  = isOwn ? "student" : "admin";
  const label = isOwn ? "You" : "Admin";
  const time  = m.created_at
    ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  return `
    <div class="chat-msg chat-msg--${side}">
      <span class="chat-sender">${label}</span>
      <div class="chat-bubble">${escapeHtml(m.message)}</div>
      ${time ? `<span class="chat-time">${time}</span>` : ""}
    </div>`;
}

function renderMessages(messages) {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;

  if (!messages || messages.length === 0) {
    chatBox.innerHTML = `<p style="color:#aaa;font-size:13px;text-align:center;">No messages yet.</p>`;
    return;
  }

  chatBox.innerHTML = messages.map(messageBubble).join("");
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessageToUI(m) {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;
  const placeholder = chatBox.querySelector("p");
  if (placeholder) placeholder.remove();
  chatBox.insertAdjacentHTML("beforeend", messageBubble(m));
  chatBox.scrollTop = chatBox.scrollHeight;
}

function subscribeToMessages(claimId) {
  if (_msgChannel) { _sb.removeChannel(_msgChannel); _msgChannel = null; }

  _msgChannel = _sb
    .channel(`messages-student-${claimId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `claim_id=eq.${claimId}` },
      (payload) => {
        if (payload.new && String(payload.new.claim_id) === String(claimId)) {
          appendMessageToUI(payload.new);
        }
      }
    )
    .subscribe((status, err) => {
      if (err) console.error("[my-claims subscribeToMessages] channel error:", err);
      else console.log("[my-claims subscribeToMessages] status:", status);
    });
}

// ---------------------------------------------------------
//  Send a student message
// ---------------------------------------------------------

async function sendStudentMessage() {
  if (!_currentClaimId) return;
  const input = document.getElementById("studentMsgInput");
  const text  = (input?.value || "").trim();
  if (!text) return;

  input.value    = "";
  input.disabled = true;

  const _cu = getCurrentUser();
  const payload = {
    claim_id:    _currentClaimId,
    sender_type: _cu.role,
    sender_id:   _cu.email,
    message:     text,
  };

  console.log("[sendStudentMessage] Inserting:", payload);

  const { data, error } = await _sb
    .from("messages")
    .insert([payload])
    .select();

  console.log("[sendStudentMessage] Insert result — data:", data, " error:", error);

  if (error) {
    console.error("[sendStudentMessage] INSERT FAILED:", error.message, "code:", error.code);
    if (error.code === "42501") {
      alert("\u274C Blocked by Row Level Security.\nFix in Supabase: Disable RLS on messages table or add: CREATE POLICY \"allow_all\" ON messages FOR ALL USING (true);");
    } else {
      alert("Failed to send message: " + error.message);
    }
    input.value    = text;
    input.disabled = false;
    return;
  }

  // Reload to confirm persistence; real-time also appends if active
  input.disabled = false;
  input.focus();
  await loadMessages(_currentClaimId);
}

// ---------------------------------------------------------
//  Init
// ---------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  _studentEmail = getCurrentUser().email;

  loadClaims();

  // Close modal
  document.getElementById("mcClose").addEventListener("click", closeModal);
  document.getElementById("mcOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Send button
  document.getElementById("studentSendBtn").addEventListener("click", sendStudentMessage);

  // Enter key to send
  document.getElementById("studentMsgInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendStudentMessage(); }
  });

  // Search filter
  const searchInput = document.getElementById("claimSearch");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const value = searchInput.value.toLowerCase().trim();
      if (!value) { renderClaims(_allClaims); return; }
      const filtered = _allClaims.filter(c =>
        (c.item_name || "").toLowerCase().includes(value) ||
        (c.location  || "").toLowerCase().includes(value)
      );
      renderClaims(filtered);
    });
  }
});
