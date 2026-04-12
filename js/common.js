// ===========================
// Login / Session Management
// ===========================
function requireLogin() {
  const user = JSON.parse(localStorage.getItem("currentUser")) || localStorage.getItem("sessionEmail");
  const publicPages = ["dashboard.html", "report.html", "index.html"];
  const currentPage = window.location.pathname.split("/").pop();

  if (!user && !publicPages.includes(currentPage)) {
    window.location.href = "login.html";
  }
}

function logout() {
  localStorage.removeItem("sessionEmail");
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  // Set role label dynamically
  const roleLabel = document.getElementById("avatarRoleLabel");
  if (roleLabel) {
    const role = localStorage.getItem("role") || "student";
    roleLabel.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  }

  // Wire logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      logout();
    });
  }

  // Wire role-switch <select>
  const roleSelect = document.getElementById("roleSwitch");
  if (roleSelect) {
    roleSelect.value = localStorage.getItem("role") || "student";
    roleSelect.addEventListener("change", () => {
      const newRole = roleSelect.value;
      localStorage.setItem("role", newRole);
      window.location.href = newRole === "admin" ? "admin-dashboard.html" : "dashboard.html";
    });
  }

  // Profile avatar dropdown (works for both .avatar-wrapper and legacy #profileAvatar)
  const avatar = document.getElementById("profileAvatar");
  const menu = document.querySelector(".profile-menu");

  if (avatar && menu) {
    avatar.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("active");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.remove("active");
      }
    });
  }
});


// Base API URL — all frontend files use this constant
const BASE_URL = "http://localhost:3001";

// ===========================
// Role Switching
// ===========================
function switchRole(targetRole) {
  localStorage.setItem("role", targetRole);
  if (targetRole === "admin") {
    window.location.href = "admin-dashboard.html";
  } else {
    window.location.href = "dashboard.html";
  }
}

// Redirect to the correct dashboard based on stored role
(function checkRoleRedirect() {
  const role = localStorage.getItem("role") || "student";
  const page = window.location.pathname.split("/").pop();
  if (page === "dashboard.html" && role === "admin") {
    window.location.replace("admin-dashboard.html");
  } else if (page === "admin-dashboard.html" && role === "student") {
    window.location.replace("dashboard.html");
  }
})();

const toastState = {
  currentToast: null,
  timeoutId: null,
  lastMessage: "",
  lastType: ""
};

function getToastContainer() {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }
  return container;
}

function dismissToast(toast) {
  if (!toast || toast.classList.contains("hide")) return;
  toast.classList.add("hide");
  clearTimeout(toastState.timeoutId);
  toast.addEventListener("transitionend", () => {
    if (toast.parentElement) toast.remove();
    if (toastState.currentToast === toast) {
      toastState.currentToast = null;
      toastState.lastMessage = "";
      toastState.lastType = "";
    }
  }, { once: true });
}

function showToast(message, type = "success") {
  if (toastState.currentToast && toastState.lastMessage === message && toastState.lastType === type) {
    return;
  }

  const container = getToastContainer();
  if (toastState.currentToast) {
    dismissToast(toastState.currentToast);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button type="button" class="toast-close" aria-label="Close">&times;</button>
  `;

  toast.querySelector(".toast-close").addEventListener("click", () => dismissToast(toast));
  container.appendChild(toast);
  toastState.currentToast = toast;
  toastState.lastMessage = message;
  toastState.lastType = type;

  requestAnimationFrame(() => toast.classList.add("visible"));
  toastState.timeoutId = setTimeout(() => dismissToast(toast), 3000);
  return toast;
}

function showSuccessToast(message) {
  showToast(message, "success");
}

function showErrorToast(message) {
  showToast(message, "error");
}

window.Toast = {
  showToast,
  showSuccessToast,
  showErrorToast,
  dismissToast
};

