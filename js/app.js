document.addEventListener("DOMContentLoaded", function () {

  // ---------- Helpers ----------
  function getReports() {
    try {
      return JSON.parse(localStorage.getItem("reports")) || [];
    } catch (e) {
      return [];
    }
  }
  function setReports(list) {
    localStorage.setItem("reports", JSON.stringify(list || []));
  }
  function normalizeDate(s) {
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }

  // =========================================================
  // FORM: Report Item (report.html)
  // =========================================================
  const form = document.querySelector("form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const itemName = document.querySelector("#itemName")?.value || "";
      const location = document.querySelector("#location")?.value || "";
      const dateFound = document.querySelector("#dateFound")?.value || "";
      const timeFound = document.querySelector("#timeFound")?.value || "";
      const description = document.querySelector("#description")?.value || "";

      const reports = getReports();
      reports.push({
        itemName,
        location,
        dateFound,
        timeFound,
        description,
        status: "Pending"
      });
      setReports(reports);

      form.reset();

      // keep UI in sync if user is on another tab via SPA-like navigation
      renderReports();
      renderSubmissions();
    });
  }

  // =========================================================
  // PROFILE: My submissions list + Clear All (profile.html)
  // =========================================================
  const submissionsListEl = document.getElementById("my-submissions");
  const clearBtn = document.getElementById("clear-submissions");
  const confirmPopup = document.getElementById("confirm-popup"); // optional
  const confirmYes = document.getElementById("confirm-yes");
  const confirmNo  = document.getElementById("confirm-no");

  function renderSubmissions() {
    if (!submissionsListEl) return; // not on profile page
    const reports = getReports();
    submissionsListEl.innerHTML = "";
    reports.forEach(r => {
      const li = document.createElement("li");
      li.textContent = `${r.itemName} - ${r.location} on ${r.dateFound} at ${r.timeFound}`;
      submissionsListEl.appendChild(li);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      // If modal exists, open it; otherwise clear immediately
      if (confirmPopup && confirmYes && confirmNo) {
        confirmPopup.style.display = "flex";
      } else {
        localStorage.removeItem("reports");
        renderSubmissions();
        renderReports();
      }
    });
  }

  if (confirmYes) {
    confirmYes.addEventListener("click", () => {
      localStorage.removeItem("reports");
      if (confirmPopup) confirmPopup.style.display = "none";
      renderSubmissions();
      renderReports();
    });
  }
  if (confirmNo) {
    confirmNo.addEventListener("click", () => {
      if (confirmPopup) confirmPopup.style.display = "none";
    });
  }

  // =========================================================
  // DASHBOARD: Filters + Table (dashboard.html)
  // =========================================================
  const itemSearch      = document.getElementById("itemSearch");
  const locationSearch  = document.getElementById("locationSearch");
  const dateSearch      = document.getElementById("dateSearch");
  const statusFilter    = document.getElementById("statusFilter");
  const totalCountEl    = document.getElementById("totalCount");
  const reportTableBody = document.getElementById("reportTableBody");

  function renderReports() {
    if (!reportTableBody) return; // not on dashboard page

    const reports = getReports();

    const qItem = (itemSearch?.value || "").trim().toLowerCase();
    const qLoc  = (locationSearch?.value || "").trim().toLowerCase();
    const qDate = normalizeDate(dateSearch?.value || "");
    const qStat = statusFilter?.value || "";

    const filtered = reports.filter(r => {
      const okItem = !qItem || r.itemName.toLowerCase().includes(qItem);
      const okLoc  = !qLoc  || r.location.toLowerCase().includes(qLoc);
      const okDate = !qDate || normalizeDate(r.dateFound) === qDate;
      const okStat = !qStat || r.status === qStat;
      return okItem && okLoc && okDate && okStat;
    });

    if (totalCountEl) totalCountEl.textContent = filtered.length.toString();

    reportTableBody.innerHTML = "";
    filtered.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.itemName}</td>
        <td>${r.location}</td>
        <td>${r.dateFound}</td>
        <td>${r.status}</td>
      `;
      reportTableBody.appendChild(tr);
    });
  }

  // Hook up filters (only if present)
  [itemSearch, locationSearch, dateSearch].forEach(inp => {
    if (inp) inp.addEventListener("input", renderReports);
  });
  if (statusFilter) statusFilter.addEventListener("change", renderReports);

  // =========================================================
  // Initial paint for whichever page we're on
  // =========================================================
  renderSubmissions(); // if on profile, fills the list; otherwise no-op
  renderReports();     // if on dashboard, draws table; otherwise no-op
});
