document.addEventListener("DOMContentLoaded", function () {
  const submissionsTable = document.querySelector("#submissionsTable tbody");
  const filterItem = document.querySelector("#filterItem");
  const filterLocation = document.querySelector("#filterLocation");
  const filterDate = document.querySelector("#filterDate");
  const filterStatus = document.querySelector("#filterStatus");

  const editModal = document.querySelector("#editModal");
  const editForm = document.querySelector("#editForm");
  const cancelBtn = document.querySelector("#cancelBtn");

  let currentEditId = null;

  async function loadSubmissions() {
    try {
      let submissions = await SubmissionAPI.getSubmissions();

      // Apply filters
      const itemFilter = filterItem.value.toLowerCase();
      const locationFilter = filterLocation.value.toLowerCase();
      const dateFilter = filterDate.value;
      const statusFilter = filterStatus.value;

      submissions = submissions.filter((sub) => {
        return (
          (!itemFilter || sub.itemName.toLowerCase().includes(itemFilter)) &&
          (!locationFilter || sub.location.toLowerCase().includes(locationFilter)) &&
          (!dateFilter || sub.date === dateFilter) &&
          (!statusFilter || sub.status === statusFilter)
        );
      });

      // Clear and populate table
      submissionsTable.innerHTML = "";
      submissions.forEach((sub) => {
        const row = document.createElement("tr");
       row.innerHTML = `
  <td>${sub.itemName}</td>
  <td>${sub.location}</td>
  <td>${sub.date}</td>
  <td>
    <span class="status-pill ${
      sub.status === "Pending" ? "status-pending" : "status-claimed"
    }">
      ${sub.status}
    </span>
  </td>
`;


        // Double-click row to edit
        row.addEventListener("dblclick", () => openEditModal(sub));
        submissionsTable.appendChild(row);
      });
    } catch (error) {
      console.error("Error loading submissions:", error);
    }
  }

  // Open modal with submission data
  function openEditModal(sub) {
    currentEditId = sub.id;
    document.querySelector("#editId").value = sub.id;
    document.querySelector("#editItemName").value = sub.itemName;
    document.querySelector("#editLocation").value = sub.location;
    document.querySelector("#editDate").value = sub.date;
    document.querySelector("#editStatus").value = sub.status;

    editModal.style.display = "flex";
  }

  // Save changes
  editForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const updatedData = {
      id: currentEditId,
      itemName: document.querySelector("#editItemName").value.trim(),
      location: document.querySelector("#editLocation").value.trim(),
      date: document.querySelector("#editDate").value,
      status: document.querySelector("#editStatus").value
    };

    try {
      await SubmissionAPI.updateSubmission(currentEditId, updatedData);
      editModal.style.display = "none";
      loadSubmissions();
    } catch (error) {
      console.error("Error updating submission:", error);
    }
  });

  // Cancel button
  cancelBtn.addEventListener("click", () => {
    editModal.style.display = "none";
  });

  // Event listeners for filters
  [filterItem, filterLocation, filterDate, filterStatus].forEach((input) => {
    input.addEventListener("input", loadSubmissions);
  });

  loadSubmissions();
});
