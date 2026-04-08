// ===========================
// Login / Session Management
// ===========================
function requireLogin() {
  return; // DEV MODE: login check bypassed for testing
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    window.location.href = "login.html";
  }
}
document.addEventListener("DOMContentLoaded", () => {
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

function logout() {
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("currentUser");
  // DEV MODE: redirect disabled for testing
  // window.location.href = "login.html";
}


// Base API URL — all frontend files use this constant
const BASE_URL = "https://lostandfound-app-y4r4.onrender.com";

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

