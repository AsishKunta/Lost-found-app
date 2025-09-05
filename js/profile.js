document.addEventListener("DOMContentLoaded", async function () {
  const submissionsList = document.querySelector("#profileSubmissions");
  const clearBtn = document.querySelector("#clearAllBtn");

  async function loadProfileSubmissions() {
    try {
      const submissions = await SubmissionAPI.getSubmissions();

      submissionsList.innerHTML = "";
      submissions.forEach((sub) => {
        const li = document.createElement("li");
        li.textContent = `${sub.itemName} - ${sub.location} (${sub.date}) [${sub.status}]`;
        submissionsList.appendChild(li);
      });
    } catch (error) {
      console.error("Error loading profile submissions:", error);
    }
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", async function () {
      if (!confirm("Are you sure you want to clear all submissions?")) return;

      try {
        await SubmissionAPI.clearAllSubmissions();
        loadProfileSubmissions();
      } catch (error) {
        console.error("Error clearing submissions:", error);
      }
    });
  }

  loadProfileSubmissions();
});
