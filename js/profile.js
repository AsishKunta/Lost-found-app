console.log("PROFILE JS LOADED");

document.addEventListener("DOMContentLoaded", async () => {
  const sessionEmail = localStorage.getItem("sessionEmail");
  console.log("PROFILE SESSION EMAIL:", sessionEmail);

  if (!sessionEmail) {
    console.warn("No session. Redirecting to login.");
    window.location.href = "login.html";
    return;
  }

  // Show loading state in header while fetching
  const profileNameEl = document.getElementById("profileName");
  const profileEmailEl = document.getElementById("profileEmail");
  if (profileNameEl) profileNameEl.textContent = "Loading...";
  if (profileEmailEl) profileEmailEl.textContent = "";

  // Fetch full user data from API
  let user;
  console.log("Fetching profile for:", sessionEmail);
  try {
    const res = await fetch(`${BASE_URL}/auth/profile/${encodeURIComponent(sessionEmail)}`);
    if (!res.ok) {
      console.error("Failed to fetch profile, status:", res.status);
      throw new Error("Profile not found.");
    }
    const data = await res.json();
    console.log("API response:", data);
    user = data.user;
  } catch (err) {
    console.error("Failed to load profile:", err);
    window.location.href = "login.html";
    return;
  }

  console.log("PROFILE LOADED USER:", user);

  const profileName     = document.getElementById("profileName");
  const profileEmail    = document.getElementById("profileEmail");
  const profileStatus   = document.getElementById("profileStatus");
  const profileJoined   = document.getElementById("profileJoined");
  const profileInitials = document.getElementById("profileInitials");
  const editBtn         = document.getElementById("editBtn");
  const editForm        = document.getElementById("editForm");
  const cancelBtn       = document.getElementById("cancelEdit");
  const clearAllBtn     = document.getElementById("clearAllBtn");

  const submissionsContainer = document.getElementById("submissionsContainer");
  const submissionsCount     = document.getElementById("submissionsCount");
  const loadingMessage       = document.getElementById("loadingMessage");

  const statLost      = document.getElementById("statLost");
  const statClaims    = document.getElementById("statClaims");
  const statRecovered = document.getElementById("statRecovered");

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
    profileName.textContent     = user.name  || "Not set";
    profileEmail.textContent    = user.email || "Not set";
    profileInitials.textContent = getInitials(user.name || "User");
    if (profileStatus) profileStatus.textContent = "Active";
    if (profileJoined && user.created_at) {
      profileJoined.textContent = new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric"
      });
    }
  }

  function setStats(reportedItems) {
    const lostCount      = reportedItems.length;
    const recoveredCount = reportedItems.filter((item) =>
      ["claimed", "recovered"].includes((item.status || "").toLowerCase())
    ).length;

    // Claims count fetched from backend claims table (filtered by email)
    const claimsCount = reportedItems.filter((item) =>
      (item.status || "").toLowerCase() === "claimed"
    ).length;

    if (statLost)      statLost.textContent      = String(lostCount);
    if (statClaims)    statClaims.textContent     = String(claimsCount);
    if (statRecovered) statRecovered.textContent  = String(recoveredCount);
    if (submissionsCount) submissionsCount.textContent = String(lostCount);
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
          <div class="empty-message-line"><span class="empty-bullet">•</span> No reports yet</div>
          <p>You haven't reported anything yet. Start helping others by reporting lost items.</p>
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
          <div class="submission-title">${submission.item_name || submission.itemName || "Unnamed item"}</div>
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
    });

    cancelBtn.addEventListener("click", () => {
      editForm.style.display = "none";
    });

    editForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const newName = document.getElementById("editName").value.trim();
      if (!newName) return;

      // Update local display name (no PUT endpoint yet)
      user.name = newName;
      renderProfile();
      editForm.style.display = "none";
    });
  }

  function wireClearSubmissions() {
    // Clear-all is not supported in the PostgreSQL backend (no bulk delete endpoint).
    // Hide the button to avoid confusion.
    if (clearAllBtn) clearAllBtn.style.display = "none";
  }

  // --- Dev Mode: Reset User ---
  document.getElementById("resetUser")?.addEventListener("click", () => {
    localStorage.clear();
    location.reload();
  });

  renderProfile();
  wireEditProfile();
  wireClearSubmissions();
  loadSubmissions();
});
