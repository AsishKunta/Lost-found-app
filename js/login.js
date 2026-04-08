console.log("LOGIN JS LOADED");

document.addEventListener("DOMContentLoaded", function () {

  // Auto-redirect if already logged in
  const existing = JSON.parse(localStorage.getItem("currentUser"));
  if (existing) {
    window.location.href = "dashboard.html";
    return;
  }

  const loginForm = document.getElementById("loginForm");
  console.log("Form found:", loginForm);

  // ----- Fake login handler (no password validation) -----
  function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    console.log("FORM SUBMITTED");

    const identifierEl = document.getElementById("identifier");
    const identifier = identifierEl ? identifierEl.value.trim() : "";

    const fakeUser = {
      name: identifier || "Guest User",
      email: identifier || "guest@unt.edu"
    };

    // Store under both keys for compatibility with requireLogin()
    localStorage.setItem("currentUser", JSON.stringify(fakeUser));
    localStorage.setItem("loggedInUser", JSON.stringify(fakeUser));
    console.log("USER STORED", fakeUser);

    window.location.href = "dashboard.html";
  }

  // Attach to form submit
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Attach to button click as fallback
  // (handles cases where onsubmit="return false;" blocks submit event)
  const signInBtn = document.querySelector("#loginForm button[type='submit']");
  console.log("Sign In button found:", signInBtn);
  if (signInBtn) {
    signInBtn.addEventListener("click", handleLogin);
  }

});

// ----- Kept for future real-auth use -----
async function fetchUsers() {
  try {
    const res = await fetch(`${BASE_URL}/users`);
    if (!res.ok) throw new Error("Failed to fetch users");
    return await res.json();
  } catch (err) {
    console.error("Error fetching users:", err);
    return [];
  }
}

