// Cache fetched reports so filters re-render without re-fetching
let allReports       = [];
let activeCategory   = "";
let activeStatus     = "";
let _dashInitialized = false;

function initDashboard() {
  if (_dashInitialized) {
    loadReports(); // refresh data on every visit
    return;
  }
  _dashInitialized = true;
  wireDetailModal();
  wireFilters();
  loadReports();
}

// router.js handles registerPage('dashboard', ...) with role dispatch
window.initStudentDashboard = initDashboard;

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
  // Global search input
  const searchInput = document.getElementById("globalSearch");
  const clearBtn    = document.getElementById("searchClearBtn");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      if (clearBtn) clearBtn.style.display = searchInput.value ? "flex" : "none";
      renderCards();
    });
  }

  // Category chips
  document.querySelectorAll(".chip[data-category]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip[data-category]").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeCategory = chip.dataset.category;
      renderCards();
    });
  });

  // Status tabs
  document.querySelectorAll(".status-tab[data-status]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".status-tab[data-status]").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeStatus = tab.dataset.status;
      renderCards();
    });
  });
}

/* -------------------------
   Update Statistics
------------------------- */
function updateStats(reports) {
  const totalReports  = reports.length;
  const itemsClaimed  = reports.filter(r => (r.claimStatus || "").toLowerCase() === "claimed").length;
  const pendingClaims = reports.filter(r => (r.claimStatus || "").toLowerCase() !== "claimed").length;

  const statNumbers = document.querySelectorAll(".stat-number");
  if (statNumbers.length >= 3) {
    statNumbers[0].textContent = totalReports;
    statNumbers[1].textContent = itemsClaimed;
    statNumbers[2].textContent = pendingClaims;
  }
}

/* -------------------------
   Load Reports from API (cache-first)
------------------------- */
const REPORTS_CACHE_KEY = "lf_reports_cache_v2";

function showSkeletonCards() {
  const grid = document.getElementById("reportCards");
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="rc-card rc-skeleton">
      <div class="rc-img-wrap skel-block"></div>
      <div class="rc-body">
        <div class="skel-line skel-title"></div>
        <div class="skel-line skel-meta"></div>
        <div class="skel-line skel-meta skel-meta--short"></div>
      </div>
    </div>`).join("");
}

async function loadReports() {
  // ── Step 1: render cached data instantly if available ──────────────────
  const raw = localStorage.getItem(REPORTS_CACHE_KEY);
  if (raw) {
    try {
      allReports = JSON.parse(raw);
      updateStats(allReports);
      renderCards();
    } catch (_) {
      localStorage.removeItem(REPORTS_CACHE_KEY);
    }
  } else {
    // No cache yet — show skeleton so screen isn't blank
    showSkeletonCards();
  }

  // ── Step 2: always fetch fresh data in background ──────────────────────
  try {
    const res = await fetch(`${BASE_URL}/reports`);
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    const fresh = await res.json();

    // Only update UI if data actually changed
    if (JSON.stringify(fresh) !== JSON.stringify(allReports)) {
      allReports = fresh;
      updateStats(allReports);
      renderCards();
    }

    localStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(fresh));
  } catch (err) {
    console.error("Error fetching reports:", err);
    // Only show error if we have nothing to display
    if (!raw) {
      const grid = document.getElementById("reportCards");
      if (grid) {
        grid.innerHTML = `
          <div class="rc-empty">
            <i class="fas fa-wifi" style="color:#d1d5db;"></i>
            <p>Could not load reports — is the backend running?</p>
          </div>`;
      }
    }
  }
}

/* -------------------------
   Render Cards with Filters
------------------------- */
function renderCards() {
  const searchVal = (document.getElementById("globalSearch")?.value || "").trim().toLowerCase();

  const filtered = allReports.filter((r) => {
    const matchesSearch = !searchVal
      || (r.itemName  || "").toLowerCase().includes(searchVal)
      || (r.location  || "").toLowerCase().includes(searchVal);
    const matchesCat    = !activeCategory
      || (r.category || "").toLowerCase() === activeCategory.toLowerCase();
    const matchesStatus = !activeStatus
      || (r.claimStatus || "").toLowerCase() === activeStatus.toLowerCase();
    return matchesSearch && matchesCat && matchesStatus;
  });

  const grid = document.getElementById("reportCards");
  if (!grid) return;
  grid.innerHTML = "";

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="rc-empty">
        <i class="fas fa-box-open"></i>
        <p>No reports found</p>
      </div>`;
    return;
  }

  filtered.forEach((report) => {
    const isClaimed   = (report.claimStatus || "").toLowerCase() === "claimed";
    const statusClass = isClaimed ? "claimed" : "pending";
    const statusLabel = isClaimed ? "Claimed" : "Pending";
    // imageUrl is a full URL for new Supabase uploads; old local paths need BASE_URL
    const imgSrc = report.imageUrl
      ? (report.imageUrl.startsWith("http") ? report.imageUrl : `${BASE_URL}${report.imageUrl}`)
      : "";
    console.log("[dashboard] report id:", report.id, "imageUrl:", report.imageUrl || "none");

    const card = document.createElement("div");
    card.className = "rc-card";

    // Always render the placeholder behind; the <img> overlays it when it loads.
    // onerror hides the img – placeholder already visible underneath.
    const imgMarkup = imgSrc
      ? `<img class="rc-img" src="${imgSrc}" alt="${escapeHtml(report.itemName)}"
              loading="lazy" onerror="this.style.display='none'">`
      : "";

    card.innerHTML = `
      <div class="rc-img-wrap">
        <div class="rc-img-placeholder">
          <i class="fas fa-image"></i>
          <span>No image</span>
        </div>
        ${imgMarkup}
        <span class="rc-badge rc-badge--${statusClass}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="rc-body">
        <div class="rc-title">${escapeHtml(report.itemName || "Unknown Item")}</div>
        <div class="rc-meta"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(report.location || "N/A")}</div>
        <div class="rc-meta"><i class="fas fa-calendar-alt"></i> ${escapeHtml(formatDate(report.dateFound))}</div>
      </div>
    `;

    card.addEventListener("click", () => {
      const imgDetail = imgSrc
        ? `<img src="${imgSrc}" alt="Item photo"
                style="width:100%;max-height:260px;object-fit:cover;border-radius:8px;margin-bottom:16px;border:1px solid #e5e7eb;"
                onerror="this.style.display='none'">`
        : "";

      const detailsHtml = `
        <h2>Report Details</h2>
        ${imgDetail}
        <div class="detail-row"><i class="fas fa-box"></i> <strong>Item:</strong>&nbsp;<span>${escapeHtml(report.itemName || "N/A")}</span></div>
        <div class="detail-row"><i class="fas fa-tag"></i> <strong>Category:</strong>&nbsp;<span>${escapeHtml(report.category || "N/A")}</span></div>
        <div class="detail-row"><i class="fas fa-map-marker-alt"></i> <strong>Location:</strong>&nbsp;<span>${escapeHtml(report.location || "N/A")}</span></div>
        <div class="detail-row"><i class="fas fa-calendar"></i> <strong>Date:</strong>&nbsp;<span>${escapeHtml(report.dateFound || "N/A")}</span></div>
        <div class="detail-row"><i class="fas fa-clock"></i> <strong>Status:</strong>&nbsp;<span class="status-badge status-${statusClass}">${escapeHtml(statusLabel)}</span></div>
        <div class="detail-row"><i class="fas fa-align-left"></i> <strong>Description:</strong>&nbsp;<span>${escapeHtml(report.description || "N/A")}</span></div>
        <div class="modal-actions">
          <button class="print-btn" onclick="window.print()"><i class="fa-solid fa-print"></i> Print Report</button>
          <button class="claim-btn" onclick="navigate('claim', ${report.id})"><i class="fa-solid fa-file-circle-check"></i> File a Claim</button>
          <button class="back-btn" onclick="hideDetailModal()"><i class="fa-solid fa-arrow-left"></i> Back</button>
        </div>
      `;
      showDetailModal(detailsHtml);
    });

    grid.appendChild(card);
  });
}

/* -------------------------
   Clear Search
------------------------- */
function clearSearch() {
  const input  = document.getElementById("globalSearch");
  const clearBtn = document.getElementById("searchClearBtn");
  if (input)    { input.value = ""; input.focus(); }
  if (clearBtn) { clearBtn.style.display = "none"; }
  renderCards();
}
