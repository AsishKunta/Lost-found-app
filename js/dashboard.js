requireLogin();

document.addEventListener("DOMContentLoaded", () => {
  // Read currentUser from localStorage
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) {
    // DEV MODE: login redirect disabled for testing
    // window.location.href = "login.html";
    // return;
  }
  console.log("Welcome", currentUser?.name ?? "Guest (dev mode)");

  wireDetailModal();
  loadReports();
  wireFilters();
  updateStats();
});

/* -------------------------
   Modal Wiring
------------------------- */
function wireDetailModal() {
  const detailModal = document.getElementById("detailModal");
  const closeBtn = document.getElementById("closeDetailBtn");

  if (closeBtn) closeBtn.addEventListener("click", hideDetailModal);

  if (detailModal) {
    detailModal.addEventListener("click", (e) => {
      if (e.target === detailModal) hideDetailModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideDetailModal();
  });
}

function showDetailModal(html) {
  const body = document.getElementById("detailBody");
  const modal = document.getElementById("detailModal");
  if (body) body.innerHTML = html;
  if (modal) modal.classList.add("show");
}

function hideDetailModal() {
  const modal = document.getElementById("detailModal");
  if (modal) modal.classList.remove("show");
}

/* -------------------------
   Helpers
------------------------- */
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  
  // Assuming dateString is in YYYY-MM-DD format
  const parts = dateString.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${month}-${day}-${year}`;
  }
  
  return dateString; // fallback to original if format is unexpected
}

/* -------------------------
   Wire Filters
------------------------- */
function wireFilters() {
  const item = document.getElementById("filterItem");
  const location = document.getElementById("filterLocation");
  const date = document.getElementById("filterDate");
  const status = document.getElementById("filterStatus");

  [item, location, date, status].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", loadReports);
    el.addEventListener("change", loadReports);
  });

  // Handle clear button visibility for text inputs
  [item, location].forEach((input) => {
    if (!input) return;
    const wrapper = input.closest('.input-wrapper');
    const clearBtn = wrapper ? wrapper.querySelector('.clear-btn') : null;
    
    if (clearBtn) {
      // Initial state
      clearBtn.style.display = input.value ? 'flex' : 'none';
      
      // Update on input
      input.addEventListener('input', () => {
        clearBtn.style.display = input.value ? 'flex' : 'none';
      });
    }
  });
}

/* -------------------------
   Update Statistics
------------------------- */
async function updateStats() {
  try {
    const response = await fetch(`${BASE_URL}/reports`);
    if (!response.ok) throw new Error("Failed to fetch reports");
    const reports = await response.json();

    const totalReports  = reports.length;
    const itemsClaimed  = reports.filter(r => (r.status || "").toLowerCase() === "claimed").length;
    const pendingClaims = reports.filter(r => (r.status || "").toLowerCase() === "pending").length;

    const statNumbers = document.querySelectorAll(".stat-number");
    if (statNumbers.length >= 3) {
      statNumbers[0].textContent = totalReports;
      statNumbers[1].textContent = itemsClaimed;
      statNumbers[2].textContent = pendingClaims;
    }
  } catch (err) {
    console.error("Error updating statistics:", err);
  }
}

/* -------------------------
   Load Reports with Filters
------------------------- */
async function loadReports() {
  try {
    const response = await fetch(`${BASE_URL}/reports`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch reports");
    const reports = await response.json();

    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Read filter values
    const itemVal   = document.getElementById("filterItem")?.value.trim().toLowerCase() || "";
    const locVal    = document.getElementById("filterLocation")?.value.trim().toLowerCase() || "";
    const dateVal   = document.getElementById("filterDate")?.value || "";
    const statusVal = document.getElementById("filterStatus")?.value.toLowerCase() || "";

    const filtered = reports.filter((r) => {
      const matchesItem   = !itemVal   || (r.itemName || "").toLowerCase().includes(itemVal);
      const matchesLoc    = !locVal    || (r.location || "").toLowerCase().includes(locVal);
      const matchesDate   = !dateVal   || r.dateFound === dateVal;
      const matchesStatus = !statusVal || (r.status || "").toLowerCase() === statusVal;
      return matchesItem && matchesLoc && matchesDate && matchesStatus;
    });

    const tableBody = document.querySelector("#submissionsTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#9ca3af;">No reports found.</td></tr>`;
      return;
    }

    filtered.forEach((report) => {
      const row = document.createElement("tr");
      const statusNorm  = (report.status || "pending").toLowerCase();
      const statusClass = statusNorm === "claimed" ? "claimed" : "pending";
      const statusLabel = report.status || "Pending";

      row.innerHTML = `
        <td>${escapeHtml(report.itemName || "N/A")}</td>
        <td>${escapeHtml(report.location || "N/A")}</td>
        <td>${formatDate(report.dateFound)}</td>
        <td>
          <span class="status ${statusClass}" style="cursor:pointer;" title="Click to toggle status">${escapeHtml(statusLabel)}</span>
        </td>
      `;

      // Click status span → toggle status without opening modal
      const statusSpan = row.querySelector(".status");
      statusSpan.addEventListener("click", async (e) => {
        e.stopPropagation();
        const currentStatus = (report.status || "Pending").toLowerCase();
        const nextStatus = currentStatus === "claimed" ? "Pending" : "Claimed";
        // Optimistic UI update
        statusSpan.textContent = nextStatus;
        statusSpan.className = `status ${nextStatus.toLowerCase()}`;
        report.status = nextStatus;
        await toggleStatus(report.id, nextStatus);
      });

      // Click row → show detail modal
      row.addEventListener("click", async () => {
        try {
          const res = await fetch(`${BASE_URL}/reports/${report.id}`);
          if (!res.ok) throw new Error("Report not found");
          const r = await res.json();

          const isClaimed    = (r.status || "").toLowerCase() === "claimed";
          const toggleLabel  = isClaimed ? "Mark as Pending" : "Mark as Claimed";
          const nextStatus   = isClaimed ? "Pending" : "Claimed";

          const detailsHtml = `
            <h2>Report Details</h2>
            <div class="detail-row"><i class="fas fa-box"></i> <strong>Item:</strong>&nbsp;<span>${escapeHtml(r.itemName || "N/A")}</span></div>
            <div class="detail-row"><i class="fas fa-tag"></i> <strong>Category:</strong>&nbsp;<span>${escapeHtml(r.category || "N/A")}</span></div>
            <div class="detail-row"><i class="fas fa-map-marker-alt"></i> <strong>Location:</strong>&nbsp;<span>${escapeHtml(r.location || "N/A")}</span></div>
            <div class="detail-row"><i class="fas fa-calendar"></i> <strong>Date:</strong>&nbsp;<span>${escapeHtml(r.dateFound || "N/A")}</span></div>
            <div class="detail-row"><i class="fas fa-clock"></i> <strong>Status:</strong>&nbsp;<span class="status-badge status-${(r.status || "pending").toLowerCase()}">${escapeHtml(r.status || "Pending")}</span></div>
            <div class="detail-row"><i class="fas fa-align-left"></i> <strong>Description:</strong>&nbsp;<span>${escapeHtml(r.description || "N/A")}</span></div>
            <div class="modal-actions">
              <button class="print-btn" onclick="window.print()"><i class="fa-solid fa-print"></i> Print Report</button>
              <button class="claim-btn" onclick="toggleStatus('${r.id}','${nextStatus}')"><i class="fa-solid fa-check"></i> ${toggleLabel}</button>
              <button class="back-btn" onclick="hideDetailModal()"><i class="fa-solid fa-arrow-left"></i> Back</button>
            </div>
          `;

          showDetailModal(detailsHtml);
        } catch (err) {
          console.error("Error fetching report details:", err);
        }
      });

      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading reports:", err);
  }
}

/* -------------------------
   Toggle Status
------------------------- */
async function toggleStatus(id, newStatus) {
  try {
    await fetch(`${BASE_URL}/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    hideDetailModal();
    loadReports();
    updateStats();
  } catch (err) {
    console.error("Error updating status:", err);
  }
}

/* -------------------------
   Clear Input
------------------------- */
function clearInput(id) {
  const input = document.getElementById(id);
  if (input) {
    input.value = "";
    input.focus();
    loadReports();
  }
}
