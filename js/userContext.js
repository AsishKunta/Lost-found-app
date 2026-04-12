// =============================================================
//  userContext.js — single source of truth for user identity
//
//  Load this BEFORE common.js and any page-specific scripts.
//  Provides the global getCurrentUser() function.
//  Role is persisted in localStorage under the key "role".
//  Default role is "student".
// =============================================================

/**
 * Returns the current user object based on localStorage "role".
 *
 * @returns {{ role: string, email: string, id: string }}
 */
function getCurrentUser() {
  const role = localStorage.getItem("role") || "student";

  if (role === "admin") {
    return {
      role:  "admin",
      email: "admin@test.com",
      id:    "admin-1",
    };
  }

  // For student, prefer a real logged-in email when available
  let email = "student@test.com";
  try {
    const stored = JSON.parse(localStorage.getItem("currentUser"));
    if (stored?.email) email = stored.email.toLowerCase();
  } catch (_) {}

  if (email === "student@test.com") {
    const session = localStorage.getItem("sessionEmail");
    if (session) email = session.toLowerCase();
  }

  return {
    role:  "student",
    email: email,
    id:    email,
  };
}
