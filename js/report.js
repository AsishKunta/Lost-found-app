// js/report.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const itemName   = document.querySelector("#itemName")?.value || "";
    const location   = document.querySelector("#location")?.value || "";
    const dateFound  = document.querySelector("#dateFound")?.value || "";
    const timeFound  = document.querySelector("#timeFound")?.value || "";
    const description= document.querySelector("#description")?.value || "";

    const reports = LFStore.getReports();
    reports.push({ itemName, location, dateFound, timeFound, description, status: "Pending" });
    LFStore.setReports(reports);

    form.reset();

    // Simple UX: take user to Profile to see their submission
    window.location.href = "profile.html";
  });
});
