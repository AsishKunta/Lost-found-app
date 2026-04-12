(function () {
// =========================================================
//  Admin Claims — fetches live data from GET /claims
// =========================================================

// In-memory cache of the last fetched claims list
let _claims = [];

// Currently open claim in detail modal
let _currentClaimId = null;

// Real-time message channel
let _msgChannel = null;

// ---------------------------------------------------------
//  Helpers
// ---------------------------------------------------------

function badgeClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "badge-approved";
  if (s === "rejected") return "badge-rejected";
  return "badge-pending";
}

function capitalize(str) {
  if (!str) return "Pending";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function resolveImageSrc(rawImage) {
  if (!rawImage) return "assets/no-image.png";
  if (/^https?:\/\//i.test(rawImage) || rawImage.startsWith("data:")) return rawImage;
  if (rawImage.startsWith("/")) return `${BASE_URL}${rawImage}`;
  return rawImage;
}

// ---------------------------------------------------------
//  Build a single claim card element
// ---------------------------------------------------------

function buildClaimCard(claim) {
  const card = document.createElement("div");
  card.className = "claim-card";
  card.dataset.id = claim.id;

  // Normalise API fields (snake_case from DB join)
  const itemName  = claim.item_name  || claim.itemName  || "Unknown Item";
  const status    = claim.status     || "pending";
  const email     = claim.student_email || claim.email || claim.studentEmail || "";
  const studentId = claim.student_id || "";
  const rawImage  = claim.image || claim.image_url || claim.imageUrl || "";
  const imgSrc    = resolveImageSrc(rawImage);

  card.innerHTML = `
    <div class="rc-img-wrap">
      ${
        rawImage
          ? `<img src="${escapeHtml(imgSrc)}" class="rc-img" loading="lazy"
            onerror="this.style.display='none'" />`
          : `<div class="rc-img-placeholder"><i class="fas fa-image"></i><span>No image</span></div>`
      }
      <span class="rc-badge rc-badge-${escapeHtml(status)}">${capitalize(status)}</span>
    </div>

    <div class="claim-body">
      <h3 class="claim-title">${escapeHtml(itemName)}</h3>

      <p class="claim-desc">
        <strong>Description:</strong>
        ${claim.description
          ? escapeHtml(claim.description.substring(0, 100)) + (claim.description.length > 100 ? "\u2026" : "")
          : "No description"}
      </p>

      <div class="claim-meta">
        <p><strong>Claim ID:</strong> #${escapeHtml(String(claim.id))}</p>
        ${studentId ? `<p><strong>Student ID:</strong> ${escapeHtml(String(studentId))}</p>` : ""}
        ${email     ? `<p><strong>Email:</strong> ${escapeHtml(email)}</p>`     : ""}
      </div>

      <hr class="claim-divider" />

      <div class="actions">
        ${email ? `
        <button class="msg-btn" data-action="msg">
          <i class="fas fa-envelope"></i> Message Student
        </button>` : ""}
        <button class="approve" data-action="approve">
          <i class="fas fa-check"></i> Approve
        </button>
        <button class="reject" data-action="reject">
          <i class="fas fa-times"></i> Reject
        </button>
      </div>
    </div>
  `;

  // Action buttons — stop propagation so card click doesn't also fire
  card.querySelector(".approve")?.addEventListener("click", (e) => {
    e.stopPropagation();
    handleAction(claim.id, "approved");
  });
  card.querySelector(".reject")?.addEventListener("click", (e) => {
    e.stopPropagation();
    handleAction(claim.id, "rejected");
  });
  card.querySelector(".msg-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    openMessageModal(claim.id, email);
  });

  // Click anywhere on card → open detail modal
  card.addEventListener("click", () => openClaimModal(claim));

  return card;
}

// ---------------------------------------------------------
//  Render claims into #claimsList
// ---------------------------------------------------------

function renderClaims(claims) {
  const container = document.getElementById("claimsList");
  container.innerHTML = "";

  if (!claims || claims.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>No claim requests yet.</p>
      </div>`;
    return;
  }

  claims.forEach((claim) => {
    container.appendChild(buildClaimCard(claim));
  });
}

// ---------------------------------------------------------
//  Claim detail modal
// ---------------------------------------------------------

function openClaimModal(claim) {
  const rawImage  = claim.image || claim.image_url || claim.imageUrl || "";
  const imgSrc    = resolveImageSrc(rawImage);
  const itemName  = claim.item_name || claim.itemName || "Unknown Item";
  const studentId = claim.student_id || "";
  const email     = claim.student_email || claim.email || "";
  const location  = claim.location || "";
  const status    = claim.status   || "pending";

  _currentClaimId = claim.id;

  // Image at top with fallback
  const wrap = document.getElementById("modalImageWrap");
  wrap.innerHTML = `
    <div class="modal-img-wrap">
      <img src="${escapeHtml(imgSrc)}" class="modal-img" alt="Claim image" onerror="this.onerror=null;this.src='assets/no-image.png';" />
    </div>`;

  document.getElementById("modalTitle").textContent = itemName;
  document.getElementById("modalDetails").innerHTML = `
    <strong>Claim ID:</strong> #${escapeHtml(String(claim.id))}<br>
    <strong>Status:</strong> ${capitalize(status)}<br>
    ${studentId ? `<strong>Student ID:</strong> ${escapeHtml(String(studentId))}<br>` : ""}
    ${email     ? `<strong>Email:</strong> ${escapeHtml(email)}<br>`     : ""}
    ${location  ? `<strong>Location:</strong> ${escapeHtml(location)}<br>` : ""}
    ${claim.created_at ? `<strong>Submitted:</strong> ${formatDate(claim.created_at)}<br>` : ""}
    <br>
    <p class="modal-desc"><strong>Description:</strong> ${escapeHtml(claim.description || "No description")}</p>
  `;

  document.getElementById("claimDetailOverlay").classList.add("open");
  loadMessages(claim.id);
}

function closeClaimModal() {
  document.getElementById("claimDetailOverlay").classList.remove("open");
  _currentClaimId = null;
  if (_msgChannel) _msgChannel = null;
}

// ---------------------------------------------------------
//  Chat / messaging
// ---------------------------------------------------------

async function loadMessages(claimId) {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;
  chatBox.innerHTML = `<p style="color:#aaa;font-size:13px;text-align:center;">Loading…</p>`;

  console.log("[loadMessages] Fetching for claim_id:", claimId);

  try {
    const res = await fetch(`${BASE_URL}/messages/${claimId}?viewer=admin`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log("[admin-claims loadMessages] messages loaded for claim in admin view:", {
      claim_id: claimId,
      count: data?.length ?? 0,
      rows: data,
    });

    renderMessages(data || []);
    subscribeToMessages(claimId);
  } catch (error) {
    console.error("[loadMessages] FETCH FAILED:", error.message);
    chatBox.innerHTML = `<p style="color:#ef4444;font-size:13px;text-align:center;">Failed to load messages. Check console for details.</p>`;
  }
}

function renderMessages(messages) {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;

  if (!messages || messages.length === 0) {
    chatBox.innerHTML = `<p style="color:#aaa;font-size:13px;text-align:center;">No messages yet.</p>`;
    return;
  }

  chatBox.innerHTML = messages.map((m) => messageBubble(m, "admin")).join("");
  chatBox.scrollTop = chatBox.scrollHeight;
}

function messageBubble(m, viewerRole) {
  const user  = getCurrentUser();
  const isOwn = (m.sender_role || m.sender_type) === user.role;
  const side  = isOwn ? "admin" : "student";
  const label = isOwn ? "You" : escapeHtml(m.sender_id || "Student");
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

function appendMessageToUI(m) {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;
  // Remove "no messages" placeholder if present
  const placeholder = chatBox.querySelector("p");
  if (placeholder) placeholder.remove();
  chatBox.insertAdjacentHTML("beforeend", messageBubble(m, "admin"));
  chatBox.scrollTop = chatBox.scrollHeight;
}

function subscribeToMessages(claimId) {
  _msgChannel = null;
}

async function sendAdminMessage() {
  if (!_currentClaimId) return;
  const input = document.getElementById("adminMsgInput");
  const text  = (input?.value || "").trim();
  if (!text) return;

  input.value    = "";
  input.disabled = true;

  const _cu = getCurrentUser();
  const payload = {
    claim_id:    _currentClaimId,
    sender_role: _cu.role,
    recipient_role: "student",
    sender_id:   _cu.email,
    message:     text,
  };

  console.log("[admin-claims send] outgoing admin message payload:", payload);

  try {
    const res = await fetch(`${BASE_URL}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    console.log("[admin-claims send] saved message record:", data);
  } catch (error) {
    console.error("[sendAdminMessage] INSERT FAILED:", error.message);
    alert("Failed to send message: " + error.message);
    input.value    = text;
    input.disabled = false;
    return;
  }

  // Always reload from DB to confirm the row persisted (don't rely solely on real-time)
  input.disabled = false;
  input.focus();
  await loadMessages(_currentClaimId);
}

// ---------------------------------------------------------
//  Message modal state
// ---------------------------------------------------------

let _activeMsgClaimId = null;
let _activeMsgEmail = null;

function openMessageModal(claimId, studentEmail) {
  _activeMsgClaimId = claimId;
  _activeMsgEmail = studentEmail;

  document.getElementById("msgRecipient").textContent = studentEmail;
  document.getElementById("msgTextarea").value = "";
  document.getElementById("msgOverlay").classList.add("open");
  document.getElementById("msgTextarea").focus();
}

function closeMessageModal() {
  _activeMsgClaimId = null;
  _activeMsgEmail = null;
  document.getElementById("msgTextarea").value = "";
  document.getElementById("msgOverlay").classList.remove("open");
}

async function sendMessage() {
  const text = document.getElementById("msgTextarea").value.trim();

  if (!text) {
    alert("Please enter a message before sending.");
    return;
  }

  const payload = {
    claim_id: _activeMsgClaimId,
    sender_role: "admin",
    recipient_role: "student",
    sender_id: getCurrentUser().email,
    message: text,
  };
  const claimIdForRefresh = _activeMsgClaimId;

  console.log("[admin-claims modal send] outgoing admin message payload:", payload);

  try {
    const res = await fetch(`${BASE_URL}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    console.log("[admin-claims modal send] saved message record:", data);
    closeMessageModal();
    alert("Message sent");
    if (claimIdForRefresh) await loadMessages(claimIdForRefresh);
  } catch (error) {
    console.error("[admin-claims modal send] INSERT FAILED:", error.message);
    alert("Failed to send message: " + error.message);
  }
}

// ---------------------------------------------------------
//  Fetch all claims from the backend
// ---------------------------------------------------------

async function loadClaims() {
  const container = document.getElementById("claimsList");
  container.innerHTML = `<p style="text-align:center;color:#888;">Loading claims…</p>`;
  try {
    const res = await fetch(`${BASE_URL}/claims`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _claims = await res.json();
    renderClaims(_claims);
  } catch (err) {
    console.error("loadClaims error:", err);
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Failed to load claims. Is the backend running?</p></div>`;
  }
}

// ---------------------------------------------------------
//  Handle Approve / Reject — calls PUT /claims/:id
// ---------------------------------------------------------

async function handleAction(claimId, newStatus) {
  try {
    const res = await fetch(`${BASE_URL}/claims/${claimId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.error || `HTTP ${res.status}`;
      console.error("[handleAction] Error:", msg);
      alert(`Could not update claim: ${msg}`);
      return;
    }

    console.log(`[handleAction] Claim ${claimId} → ${newStatus}`, data);
    // Refresh the list so the badge updates immediately
    await loadClaims();
  } catch (err) {
    console.error("handleAction error:", err);
    alert("Failed to update claim status. Please try again.");
  }
}

// ---------------------------------------------------------
//  Tiny XSS guard
// ---------------------------------------------------------

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------
//  Init
// ---------------------------------------------------------
  var _acInitialized = false;

  function initAdminClaims() {
    loadClaims();
    if (_acInitialized) return;
    _acInitialized = true;

    var _msgOverlay = document.getElementById("msgOverlay");
    if (_msgOverlay) _msgOverlay.addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeClaimModal();
    });

    var _closeClaimBtn = document.getElementById("closeClaimModal");
    if (_closeClaimBtn) _closeClaimBtn.addEventListener("click", closeClaimModal);

    var _detailOverlay = document.getElementById("claimDetailOverlay");
    if (_detailOverlay) _detailOverlay.addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeClaimModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && document.activeElement && document.activeElement.id === "adminMsgInput") {
        e.preventDefault();
        sendAdminMessage();
      }
    });

    var _srch = document.getElementById("claimSearch");
    if (_srch) {
      _srch.addEventListener("input", function () {
        var v = _srch.value.toLowerCase().trim();
        if (!v) { renderClaims(_claims); return; }
        var filtered = _claims.filter(function (c) {
          return (c.item_name     || "").toLowerCase().includes(v) ||
                 (c.student_email || "").toLowerCase().includes(v) ||
                 String(c.student_id || "").includes(v);
        });
        renderClaims(filtered);
      });
    }
  }

  if (typeof window.registerPage === "function") {
    window.registerPage("claim-requests", initAdminClaims);
  } else {
    document.addEventListener("DOMContentLoaded", initAdminClaims);
  }
  window.closeClaimModal   = closeClaimModal;
  window.closeMessageModal = closeMessageModal;
  window.sendMessage       = sendMessage;
  window.sendAdminMessage  = sendAdminMessage;

})();
