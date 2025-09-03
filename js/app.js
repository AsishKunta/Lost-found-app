document.addEventListener("DOMContentLoaded", function () {
  // ----------------------------
  // FORM HANDLING (Report Item)
  // ----------------------------
  const form = document.querySelector("form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const itemName = document.querySelector("#itemName").value;
      const location = document.querySelector("#location").value;
      const dateFound = document.querySelector("#dateFound").value;
      const timeFound = document.querySelector("#timeFound").value;
      const description = document.querySelector("#description").value;

      // Helper: format time to AM/PM
      function showTime(t) {
        if (!t) return "_";
        const [h, m] = t.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const hh = (h % 12) || 12;
        return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
      }

      
    

      // Save to localStorage
      let reports = JSON.parse(localStorage.getItem("reports")) || [];
      reports.push({ itemName, location, dateFound, timeFound, description });
      localStorage.setItem("reports", JSON.stringify(reports));

      // Update profile submissions list (if exists)
      const submissionsList = document.querySelector("#my-submissions");
      if (submissionsList) {
        const listItem = document.createElement("li");
        listItem.textContent =
          `${itemName} — ${location} on ${dateFound} at ${showTime(timeFound)}`;
        submissionsList.appendChild(listItem);
      }

      // Reset form
      form.reset();
    });
  }

  // ----------------------------
  // CLEAR ALL BUTTON (Profile Page)
  // ----------------------------
  // CLEAR ALL BUTTON (Profile Page)
// ---------------------------------
// CLEAR ALL BUTTON (Profile Page)
// ---------------------------------
const clearBtn = document.getElementById("clear-submissions");
const confirmPopup = document.getElementById("confirm-popup");
const confirmYes = document.getElementById("confirm-yes");
const confirmNo = document.getElementById("confirm-no");

if (clearBtn && confirmPopup && confirmYes && confirmNo) {
  clearBtn.addEventListener("click", function () {
    // show modal popup
    confirmPopup.style.display = "flex";
  });

  confirmYes.addEventListener("click", function () {
    localStorage.removeItem("reports"); // clear stored reports
    const submissionsList = document.getElementById("my-submissions");
    if (submissionsList) submissionsList.innerHTML = ""; // clear UI
    confirmPopup.style.display = "none"; // close modal
  });

confirmNo.addEventListener("click", function () {
  confirmPopup.style.display = "none"; // just close modal
});
}
});