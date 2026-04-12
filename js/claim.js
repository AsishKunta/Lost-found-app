// =============================================================
//  claim.js — standalone claim submission (report_id optional)
// =============================================================

let _claimInitialized = false;
let _claimReportId    = null;

function initClaim(reportId) {
  // Always update reportId so a fresh "File a Claim" click takes effect
  _claimReportId = (reportId !== undefined && reportId !== null)
    ? parseInt(reportId, 10) : null;

  if (_claimInitialized) return; // handlers already wired
  _claimInitialized = true;

  // ----------------------------------------------------------
  //  1. DOM references
  // ----------------------------------------------------------
  const claimForm         = document.getElementById("claimForm");
  const submitBtn         = claimForm.querySelector(".submit-btn") || document.querySelector(".submit-btn");
  const buttonText        = submitBtn ? submitBtn.querySelector(".button-text") : null;
  const fileUploadWrapper = document.getElementById("fileUploadWrapper");
  const fileNameLabel     = document.getElementById("claim-fileName") || document.getElementById("fileName");

  // Pre-fill email from user context (student testing)
  const _cu = getCurrentUser();
  const emailFieldEl = document.getElementById("studentEmail");
  if (emailFieldEl && !emailFieldEl.value) emailFieldEl.value = _cu.email;

  if (!claimForm || !submitBtn || !buttonText) {
    console.error("[claim.js] Required form elements not found.");
    return;
  }

  // ----------------------------------------------------------
  //  4. Helpers
  // ----------------------------------------------------------
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      buttonText.textContent = "Submit Claim →";
    }
  }

  // ----------------------------------------------------------
  //  5. File upload label + image preview
  // ----------------------------------------------------------
  const fileInput     = document.getElementById("claimImage") || document.getElementById("claimImageInput");
  const claimPreview  = document.getElementById("claimPreview");

  if (fileUploadWrapper && fileInput) {
    fileUploadWrapper.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (file) {
        if (fileNameLabel) fileNameLabel.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
          if (claimPreview) {
            claimPreview.src = e.target.result;
            claimPreview.style.display = "block";
          }
        };
        reader.readAsDataURL(file);
      } else {
        if (fileNameLabel) fileNameLabel.textContent = "No file selected";
        if (claimPreview) { claimPreview.src = ""; claimPreview.style.display = "none"; }
      }
    });
  }

  // ----------------------------------------------------------
  //  6. Submit handler
  // ----------------------------------------------------------
  async function submitClaim(e) {
    e.preventDefault();
    if (submitBtn.disabled) return;

    // Read raw values first, then trim
    const studentIdRaw    = (document.getElementById("studentId") || {}).value || "";
    const studentEmailRaw = (document.getElementById("studentEmail") || {}).value || "";
    const itemNameRaw     = ((document.getElementById("claim-itemName") || document.getElementById("itemName")) || {}).value || "";
    const locationRaw     = ((document.getElementById("claim-location") || document.getElementById("location")) || {}).value || "";
    const descriptionRaw  = ((document.getElementById("claim-description") || document.getElementById("description")) || {}).value || "";

    const studentId    = studentIdRaw.trim();
    const studentEmail = studentEmailRaw.trim();
    const itemName     = itemNameRaw.trim();
    const location     = locationRaw.trim();
    const description  = descriptionRaw.trim();

    // Debug log — printed before any validation so you can see exactly what was read
    console.log("[submitClaim] Form values read:", {
      studentId,
      studentEmail,
      itemName,
      location,
      description,
    });

    // Validate all required fields
    if (!studentId) {
      alert("Please enter your Student ID.");
      return;
    }
    if (!studentEmail) {
      alert("Please enter your Student Email.");
      return;
    }
    if (!itemName) {
      alert("Please enter the item name.");
      return;
    }
    if (!location) {
      alert("Please enter the location where you lost it.");
      return;
    }
    if (!description) {
      alert("Please enter a description.");
      return;
    }

    setButtonState("loading");

    const imageFile = (document.getElementById("claimImage") || document.getElementById("claimImageInput"))?.files?.[0] || null;

    const formData = new FormData();
    formData.append("student_id", studentId);
    formData.append("student_email", studentEmail);
    formData.append("item_name", itemName);
    formData.append("location", location);
    formData.append("description", description);
    if (_claimReportId) formData.append("report_id", String(_claimReportId));
    if (imageFile) formData.append("image", imageFile);

    console.log("[submitClaim] Sending multipart form data", {
      student_id: studentId,
      student_email: studentEmail,
      item_name: itemName,
      location,
      description,
      report_id: _claimReportId || null,
      hasImage: !!imageFile,
    });

    try {
      const res = await fetch(`${BASE_URL}/claims`, {
        method:  "POST",
        body:    formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("[submitClaim] Backend error response:", data);
        throw new Error(data.error || `Server error (${res.status})`);
      }

      console.log("[submitClaim] Success — saved claim:", data);

      await delay(800);
      setButtonState("success");
      await delay(600);
      alert("Claim submitted successfully!");
      navigate('dashboard');
    } catch (err) {
      console.error("[submitClaim] Fetch error:", err);
      setButtonState("default");
      alert(`Error submitting claim: ${err.message}`);
    }
  }

  claimForm.addEventListener("submit", submitClaim);
}

if (typeof registerPage === "function") {
  registerPage("claim", initClaim);
} else {
  document.addEventListener("DOMContentLoaded", () => initClaim());
}
