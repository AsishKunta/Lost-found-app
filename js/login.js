console.log("LOGIN JS LOADED");

document.addEventListener("DOMContentLoaded", function () {

  // Auto-redirect if already logged in
  const existing = localStorage.getItem("sessionEmail");
  if (existing) {
    window.location.href = "dashboard.html";
    return;
  }

  // --- Element references ---
  const loginForm    = document.getElementById("loginForm");
  const signupForm   = document.getElementById("signupForm");
  const formTitle    = document.getElementById("formTitle");
  const errorMessage = document.getElementById("errorMessage");
  const toggleBtn    = document.getElementById("toggleBtn");
  const toggleText   = document.getElementById("toggleText");

  let isLoginMode = true;

  // --- Toggle between Login and Signup ---
  toggleBtn.addEventListener("click", function () {
    isLoginMode = !isLoginMode;
    errorMessage.textContent = "";

    if (isLoginMode) {
      formTitle.textContent   = "myUNT Login";
      loginForm.classList.remove("hidden");
      signupForm.classList.add("hidden");
      toggleBtn.textContent   = "Sign Up";
      toggleText.childNodes[0].textContent = "Don't have an account? ";
    } else {
      formTitle.textContent   = "Create Account";
      signupForm.classList.remove("hidden");
      loginForm.classList.add("hidden");
      toggleBtn.textContent   = "Sign In";
      toggleText.childNodes[0].textContent = "Already have an account? ";
    }
  });

  // --- Helper: validate Gmail domain ---
  function isValidGmail(email) {
    return email.endsWith("@gmail.com");
  }

  function setError(msg) {
    errorMessage.style.color = "red";
    errorMessage.textContent = msg;
  }

  function setSuccess(msg) {
    errorMessage.style.color = "green";
    errorMessage.textContent = msg;
  }

  // --- Signup handler ---
  signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name     = document.getElementById("signupName").value.trim();
    const email    = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;

    if (!isValidGmail(email)) {
      console.log("Invalid email domain:", email);
      setError("Only Gmail accounts are allowed.");
      return;
    }

    try {
      console.log("Calling API:", `${BASE_URL}/auth/signup`);
      const res  = await fetch(`${BASE_URL}/auth/signup`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, password }),
      });

      let data = {};
      try { data = await res.json(); } catch (_) {}
      console.log("Response:", data);

      if (!res.ok) {
        setError(data.error || `Server error (${res.status}). Check backend deployment.`);
        return;
      }

      console.log("Signup successful:", email);
      setSuccess("Account created! You can now sign in.");

      setTimeout(function () {
        errorMessage.textContent = "";
        if (!isLoginMode) toggleBtn.click();
      }, 1500);
    } catch (err) {
      console.error("Signup network error:", err);
      setError("Cannot reach server. Is the backend running?");
    }
  });

  // --- Login handler ---
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email    = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    if (!isValidGmail(email)) {
      console.log("Invalid email domain:", email);
      setError("Only Gmail accounts are allowed.");
      return;
    }

    try {
      console.log("Calling API:", `${BASE_URL}/auth/login`);
      const res  = await fetch(`${BASE_URL}/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });

      let data = {};
      try { data = await res.json(); } catch (_) {}
      console.log("Response:", data);

      if (!res.ok) {
        console.log("Invalid login attempt for:", email);
        setError(data.error || `Server error (${res.status}). Check backend deployment.`);
        return;
      }

      // Store minimal session info only
      localStorage.removeItem("sessionEmail");
      localStorage.setItem("sessionEmail", data.user.email);

      console.log("Login successful:", data.user.email);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Login network error:", err);
      setError("Cannot reach server. Is the backend running?");
    }
  });

});



