// js/profile.js
document.addEventListener("DOMContentLoaded", () => {
  const submissionsListEl = document.getElementById("my-submissions");
  const clearBtn          = document.getElementById("clear-submissions");
  const confirmPopup      = document.getElementById("confirm-popup");
  const confirmYes        = document.getElementById("confirm-yes");
  const confirmNo         = document.getElementById("confirm-no");

  function renderSubmissions() {
    if (!submissionsListEl) return;
    const reports = LFStore.getReports();
    submissionsListEl.innerHTML = "";
    reports.forEach(r => {
      const li = document.createElement("li");
      const prettyDate = LFStore.formatDisplayDate(r.dateFound);  
li.textContent = `${r.itemName} - ${r.location} on ${prettyDate} at ${r.timeFound}`;

      submissionsListEl.appendChild(li);
    });
  }

  renderSubmissions();

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (confirmPopup && confirmYes && confirmNo) {
        confirmPopup.style.display = "flex";
      } else {
        LFStore.clearReports();
        renderSubmissions();
      }
    });
  }

  if (confirmYes) {
    confirmYes.addEventListener("click", () => {
      LFStore.clearReports();
      if (confirmPopup) confirmPopup.style.display = "none";
      renderSubmissions();
    });
  }
  if (confirmNo) {
    confirmNo.addEventListener("click", () => {
      if (confirmPopup) confirmPopup.style.display = "none";
    });
  }
});
