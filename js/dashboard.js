// js/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  const itemSearch      = document.getElementById("itemSearch");
  const locationSearch  = document.getElementById("locationSearch");
  const dateSearch      = document.getElementById("dateSearch");
  const statusFilter    = document.getElementById("statusFilter");
  const totalCountEl    = document.getElementById("totalCount");
  const reportTableBody = document.getElementById("reportTableBody");

  function renderReports() {
    if (!reportTableBody) return;

    const reports = LFStore.getReports();

    const qItem = (itemSearch?.value || "").trim().toLowerCase();
    const qLoc  = (locationSearch?.value || "").trim().toLowerCase();
    const qDate = LFStore.normalizeDate(dateSearch?.value || "");
    const qStat = statusFilter?.value || "";

    const filtered = reports.filter(r => {
      const okItem = !qItem || (r.itemName || "").toLowerCase().includes(qItem);
      const okLoc  = !qLoc  || (r.location || "").toLowerCase().includes(qLoc);
      const okDate = !qDate || LFStore.normalizeDate(r.dateFound) === qDate;
      const okStat = !qStat || r.status === qStat;
      return okItem && okLoc && okDate && okStat;
    });

    if (totalCountEl) totalCountEl.textContent = String(filtered.length);

    reportTableBody.innerHTML = "";
    filtered.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.itemName || ""}</td>
        <td>${r.location || ""}</td>
        <td>${LFStore.formatDisplayDate(r.dateFound) || ""}</td> 
        <td>${r.status || "Pending"}</td>
      `;
      reportTableBody.appendChild(tr);
    });
  }

  [itemSearch, locationSearch, dateSearch].forEach(inp => {
    if (inp) inp.addEventListener("input", renderReports);
  });
  if (statusFilter) statusFilter.addEventListener("change", renderReports);

  renderReports();
});
