document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const itemName   = document.querySelector("#itemName").value;
    const location   = document.querySelector("#location").value;
    const dateFound  = document.querySelector("#dateFound").value;
    const timeFound  = document.querySelector("#timeFound").value;  // <= must exist
    const description= document.querySelector("#description").value;

    console.log("dateFound:", dateFound);
    console.log("timeFound (raw):", timeFound);

    function showTime(t) {
      if (!t) return "—";
      const [h, m] = t.split(":").map(Number); // works for HH:MM or HH:MM:SS
      const ampm = h >= 12 ? "PM" : "AM";
      const hh = (h % 12) || 12;
      return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
    }

    console.log("timeFound (formatted):", showTime(timeFound));

    alert(
      `Item Reported:\n\n` +
      `Name: ${itemName}\n` +
      `Location: ${location}\n` +
      `Date: ${dateFound}\n` +
      `Time: ${showTime(timeFound)}\n` +
      `Description: ${description}`
    );

    form.reset();
  });
});
