document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");

  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const itemName = document.querySelector("#itemName").value.trim();
      const location = document.querySelector("#location").value.trim();
      const date = document.querySelector("#date").value;   // ✅ now matches HTML
      const time = document.querySelector("#time").value;   // ✅ now matches HTML
      const description = document.querySelector("#description").value.trim();

      if (!itemName || !location || !date || !time) {
        alert("Please fill in all required fields.");
        return;
      }

      const newSubmission = {
        id: SubmissionAPI.generateId(),
        itemName,
        location,
        date,
        time,
        description,
        status: "Pending"
      };

      try {
        await SubmissionAPI.addSubmission(newSubmission);
        window.location.href = "dashboard.html"; // redirect after save
      } catch (error) {
        console.error("Error saving submission:", error);
        alert("Failed to save submission. Please try again.");
      }
    });
  }
});
