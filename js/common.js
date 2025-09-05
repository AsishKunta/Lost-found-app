// Base API URL for json-server
const API_URL = "http://localhost:3000/submissions";

// ========================
// API Functions
// ========================

// Get all submissions
async function getSubmissions() {
  const res = await fetch(API_URL);
  return await res.json();
}

// Add a new submission
async function addSubmission(submission) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission)
  });
  return await res.json();
}

// Update an existing submission (e.g., change status)
async function updateSubmission(id, updatedData) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedData)
  });
  return await res.json();
}

// Delete one submission
async function deleteSubmission(id) {
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
}

// Delete all submissions
async function clearAllSubmissions() {
  const submissions = await getSubmissions();
  for (const sub of submissions) {
    await deleteSubmission(sub.id);
  }
}

// ========================
// Utility Helpers
// ========================

// Generate a unique ID
function generateId() {
  return Date.now();
}

// Export globally
window.SubmissionAPI = {
  getSubmissions,
  addSubmission,
  updateSubmission,
  deleteSubmission,
  clearAllSubmissions,
  generateId
};
