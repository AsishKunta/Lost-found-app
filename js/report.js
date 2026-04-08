console.log("REPORT JS LOADED");
// Matching is now handled server-side in reportController.js

requireLogin();

let reportForm;
let submitBtn;
let buttonText;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setButtonState(state) {
  submitBtn.classList.remove("loading", "success");
  submitBtn.disabled = state !== "default";

  if (state === "loading") {
    submitBtn.classList.add("loading");
    buttonText.textContent = "Submitting...";
  } else if (state === "success") {
    submitBtn.classList.add("success");
    buttonText.textContent = "Submitted ✓";
  } else {
    buttonText.textContent = "Submit Report →";
  }
}

function markSuccessFields() {
  const fields = reportForm.querySelectorAll("input, textarea, select");
  fields.forEach((el) => el.classList.add("success-field"));
  setTimeout(() => fields.forEach((el) => el.classList.remove("success-field")), 1100);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM LOADED - attaching form handler");

  reportForm = document.getElementById("reportForm");
  submitBtn  = document.querySelector(".submit-btn");

  if (!reportForm) {
    console.error("❌ reportForm NOT FOUND");
    return;
  }

  console.log("✅ Form found");

  buttonText = submitBtn.querySelector(".button-text");

  reportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    console.log("🚀 FORM SUBMITTED CLICKED");
    if (submitBtn.disabled) return;

    const itemName    = (document.getElementById("itemName")?.value    || "").trim();
    const category    = (document.getElementById("category")?.value    || "").trim();
    const location    = (document.getElementById("location")?.value    || "").trim();
    const dateFound   = (document.getElementById("date")?.value        || "").trim();
    const timeFound   = (document.getElementById("time")?.value        || "").trim();
    const name        = (document.getElementById("name")?.value        || "").trim();
    const email       = (document.getElementById("email")?.value       || "").trim();
    const phone       = (document.getElementById("phone")?.value       || "").trim();
    const description = (document.getElementById("description")?.value || "").trim();

    if (!itemName || !category || !location) {
      showErrorToast("Please fill all required fields.");
      return;
    }

    if (!dateFound) {
      showErrorToast("Please select a date.");
      return;
    }

    setButtonState("loading");

    const newReport = {
      itemName:    itemName,
      category:    category,
      location:    location,
      dateFound:   dateFound   || null,
      timeFound:   timeFound   || null,
      name:        name        || null,
      email:       email       || null,
      phone:       phone       || null,
      description: description || null,
      status:      "Pending"
    };

    console.log("Submitting payload:", newReport);

    try {
      // ----- Step 1: POST the new report -----

      const res = await fetch(`${BASE_URL}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReport)
      });

      console.log("POST response status:", res.status, res.ok);

      if (!res.ok) throw new Error("Failed to save report");

      const result = await res.json();
      const savedItem = result.report;
      const matches = result.matches;
      console.log("Saved report:", savedItem);
      console.log("Server matches:", matches);

      if (!result || !result.report) throw new Error("Invalid response: missing report from server");

      await delay(800);

      // ----- Step 2: Animate button to success state -----
      setButtonState("success");
      markSuccessFields();

      await delay(600);

      // ----- Step 3: Redirect based on matches -----
      console.log("[redirect] matches from API:", matches);
      console.log("[redirect] match count:", matches ? matches.length : 0);

      if (matches && matches.length > 0) {
        localStorage.setItem("matches", JSON.stringify(matches));
        console.log("[redirect] → matches.html");
        window.location.href = "matches.html";
      } else {
        console.log("[redirect] → dashboard.html (no matches)");
        window.location.href = "dashboard.html";
      }

    } catch (err) {
      console.error("Error in report submit flow:", err);
      setButtonState("default");
      showErrorToast("Could not save report. Please try again.");
    }
  }); // end submit listener

  console.log("FORM HANDLER ATTACHED");
}); // end DOMContentLoaded

// =============================================================
// MATCH RESULTS UI
// Hides the report form card and renders the match results
// section returned by findMatches() in matching.js.
// =============================================================

/**
 * Safely escape HTML to prevent XSS in rendered card content.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds and returns a single match-item card element.
 */
function createMatchCard(item) {
  const isClaimed = item.status === "Claimed";
  const score = item.matchScore || 0;
  const card = document.createElement("div");
  card.style.cssText =
    "border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px;" +
    " margin-bottom: 12px; background: #fafafa;";

  const descHtml =
    item.description && item.description !== "N/A"
      ? `<p style="margin: 8px 0 0; color: #6b7280; font-size: 0.85rem;">
           ${escapeHtml(item.description)}
         </p>`
      : "";

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <span style="font-weight:600; font-size:1rem;">${escapeHtml(item.itemName || "Unknown Item")}</span>
      <span style="background:#dbeafe; color:#1d4ed8; padding:2px 10px;
                   border-radius:20px; font-size:0.78rem; font-weight:600;">
        ${score} pts
      </span>
    </div>
    <div style="display:flex; flex-wrap:wrap; gap:12px; color:#4b5563; font-size:0.875rem;">
      <span><i class="fa-solid fa-tag" style="margin-right:4px;"></i>${escapeHtml(item.category || "N/A")}</span>
      <span><i class="fa-solid fa-location-dot" style="margin-right:4px;"></i>${escapeHtml(item.location || "N/A")}</span>
      <span><i class="fa-solid fa-calendar-days" style="margin-right:4px;"></i>${escapeHtml(item.dateFound || "N/A")}</span>
      <span class="${isClaimed ? "status-claimed" : "status-pending"}"
            style="padding:1px 8px; border-radius:20px; font-size:0.78rem;">
        ${escapeHtml(item.status || "Pending")}
      </span>
    </div>
    ${descHtml}
  `;
  return card;
}

/**
 * Hides the report form section, populates match results,
 * and reveals the #matchResultSection.
 *
 * @param {Object[]} matches - Array returned by findMatches()
 */
function showMatchResults(matches) {
  // Hide the form section
  const formSection    = document.getElementById("reportFormSection");
  const resultSection  = document.getElementById("matchResultSection");
  const matchesContainer = document.getElementById("matchesContainer");
  const noMatchMsg     = document.getElementById("noMatchMsg");
  const summaryText    = document.getElementById("matchSummaryText");

  if (!resultSection || !matchesContainer || !noMatchMsg) {
    console.error("showMatchResults: required DOM elements missing");
    return;
  }

  if (formSection) formSection.style.display = "none";

  // Clear any previous render
  matchesContainer.innerHTML = "";

  if (matches.length === 0) {
    // Empty state
    if (summaryText) summaryText.textContent = "No strong matches found.";
    noMatchMsg.style.display       = "block";
    matchesContainer.style.display = "none";
  } else {
    // Render match cards
    if (summaryText) {
      summaryText.textContent =
        `Found ${matches.length} potential match${matches.length > 1 ? "es" : ""} for your item:`;
    }
    noMatchMsg.style.display       = "none";
    matchesContainer.style.display = "block";
    matches.forEach((item) => matchesContainer.appendChild(createMatchCard(item)));
  }

  resultSection.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
