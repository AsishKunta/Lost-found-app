const claimForm = document.getElementById("claimForm");
const submitBtn = document.querySelector(".submit-btn");
const buttonText = submitBtn.querySelector(".button-text");
const fileUpload = document.getElementById("fileUpload");
const fileUploadWrapper = document.getElementById("fileUploadWrapper");
const fileNameLabel = document.getElementById("fileName");

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


async function submitClaim(e) {
  e.preventDefault();
  if (submitBtn.disabled) return;

  setButtonState("loading");

  const studentId = document.getElementById("studentId").value.trim();
  const studentEmail = document.getElementById("studentEmail").value.trim();
  const description = document.getElementById("description").value.trim();

  let imageData = null;
  if (fileUpload.files.length > 0) {
    const file = fileUpload.files[0];
    imageData = await toBase64(file);
  }

  const claimData = {
    studentId,
    studentEmail,
    description,
    image: imageData,
    dateSubmitted: new Date().toISOString()
  };

  try {
    const res = await fetch(`${BASE_URL}/claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(claimData)
    });

    if (res.ok) {
      await delay(1100);
      setButtonState("success");
      showSuccessToast("Claim submitted successfully!");
      claimForm.reset();
      fileNameLabel.textContent = "No file selected";
      window.scrollTo({ top: 0, behavior: "smooth" });
      await delay(1800);
    } else {
      showErrorToast("Failed to submit claim.");
      await delay(600);
    }
  } catch (err) {
    console.error("Error submitting claim:", err);
    showErrorToast("Error submitting claim.");
    await delay(600);
  } finally {
    setButtonState("default");
  }
}

claimForm.addEventListener("submit", submitClaim);

if (fileUploadWrapper && fileUpload) {
  fileUploadWrapper.addEventListener("click", () => fileUpload.click());

  fileUpload.addEventListener("change", () => {
    const file = fileUpload.files[0];
    fileNameLabel.textContent = file ? file.name : "No file selected";
  });
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}
