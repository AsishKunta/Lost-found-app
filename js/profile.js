console.log("PROFILE JS LOADED");

requireLogin();

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  const profileName = document.getElementById("profileName");
  const profileId = document.getElementById("profileId");
  const profileEmail = document.getElementById("profileEmail");
  const profileInitials = document.getElementById("profileInitials");
  const editBtn = document.getElementById("editBtn");
  const editForm = document.getElementById("editForm");
  const cancelBtn = document.getElementById("cancelEdit");
  const clearAllBtn = document.getElementById("clearAllBtn");

  const submissionsContainer = document.getElementById("submissionsContainer");
  const submissionsCount = document.getElementById("submissionsCount");
  const loadingMessage = document.getElementById("loadingMessage");

  const statTotal = document.getElementById("statTotal");
  const statClaimed = document.getElementById("statClaimed");
  const statPending = document.getElementById("statPending");

  const requiredElements = {
    submissionsContainer,
    submissionsCount,
    loadingMessage
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingElements.length > 0) {
    console.error("Missing required profile elements:", missingElements.join(", "));
    return;
  }

  function getInitials(name) {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  function renderProfile() {
    if (!user) return;
    profileName.textContent = user.name || "Not set";
    profileId.textContent = user.studentId || "Not set";
    profileEmail.textContent = user.email || "Not set";
    profileInitials.textContent = getInitials(user.name || "User");
  }

  function setStats(items) {
    const total = items.length;
    const claimed = items.filter((item) => (item.status || "").toLowerCase() === "claimed").length;
    const pending = items.filter((item) => (item.status || "pending").toLowerCase() === "pending").length;

    statTotal.textContent = String(total);
    statClaimed.textContent = String(claimed);
    statPending.textContent = String(pending);
    submissionsCount.textContent = String(total);
  }

  function showLoadingState() {
    loadingMessage.hidden = false;
    loadingMessage.textContent = "Loading submissions...";
    submissionsContainer.innerHTML = "";
  }

  function showErrorState(message) {
    loadingMessage.hidden = true;
    submissionsContainer.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-copy">
          <div class="empty-message-line"><span class="empty-bullet">•</span> Unable to load submissions</div>
          <p>${message || "Please try again."}</p>
        </div>
      </div>
    `;
  }

  function showEmptyState() {
    loadingMessage.hidden = true;
    submissionsContainer.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-copy">
          <div class="empty-message-line"><span class="empty-bullet">•</span> No submissions yet</div>
          <p>Start by reporting an item</p>
          <a href="report.html" class="primary-btn empty-state-action">Report an item</a>
        </div>
      </div>
    `;
  }

  function createStatusBadge(status) {
    const normalized = (status || "pending").toLowerCase();
    const label = normalized === "claimed" ? "Claimed" : "Pending";
    const badgeClass = normalized === "claimed" ? "status-claimed" : "status-pending";
    return `<span class="status-badge ${badgeClass}">${label}</span>`;
  }

  function renderSubmissions(items) {
    loadingMessage.hidden = true;

    if (!items || items.length === 0) {
      showEmptyState();
      return;
    }

    submissionsContainer.innerHTML = "";

    items.forEach((submission) => {
      const card = document.createElement("div");
      card.className = "submission-card";
      card.innerHTML = `
        <div class="submission-card-top">
          <div class="submission-title">${submission.itemName || "Unnamed item"}</div>
          ${createStatusBadge(submission.status)}
        </div>
        <div class="submission-meta">${submission.location || "Unknown location"}</div>
      `;
      submissionsContainer.appendChild(card);
    });
  }

  function loadSubmissions() {
    showLoadingState();

    fetch(`${BASE_URL}/reports`)
      .then((res) => {
        if (!res.ok) throw new Error("Network response failed");
        return res.json();
      })
      .then((data) => {
        console.log("Fetched reports:", data);
        // Filter by the logged-in user's email if available, otherwise show all
        const allReports = Array.isArray(data) ? data : [];
        const userReports = user && user.email
          ? allReports.filter((item) => item.email === user.email)
          : allReports;
        setStats(userReports);
        renderSubmissions(userReports);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setStats([]);
        showErrorState(err.message);
      });
  }

  function wireEditProfile() {
    if (!editBtn || !editForm || !cancelBtn) return;

    editBtn.addEventListener("click", () => {
      editForm.style.display = "block";
      document.getElementById("editName").value = user?.name || "";
      document.getElementById("editId").value = user?.studentId || "";
    });

    cancelBtn.addEventListener("click", () => {
      editForm.style.display = "none";
    });

    editForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const newName = document.getElementById("editName").value.trim();
      const newId = document.getElementById("editId").value.trim();

      if (!user) return;

      user.name = newName;
      user.studentId = newId;

      localStorage.setItem("loggedInUser", JSON.stringify(user));

      let users = JSON.parse(localStorage.getItem("users")) || [];
      users = users.map((entry) =>
        entry.euid === user.euid || entry.email === user.email ? user : entry
      );
      localStorage.setItem("users", JSON.stringify(users));

      renderProfile();
      editForm.style.display = "none";
    });
  }

  function wireClearSubmissions() {
    // Clear-all is not supported in the PostgreSQL backend (no bulk delete endpoint).
    // Hide the button to avoid confusion.
    if (clearAllBtn) clearAllBtn.style.display = "none";
  }

  renderProfile();
  wireEditProfile();
  wireClearSubmissions();
  loadSubmissions();
});
