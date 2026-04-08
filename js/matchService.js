// ===== MATCH SERVICE =====

function findMatches(newItem, allItems) {
  return allItems.filter(item => {
    if (item.id === newItem.id) return false;

    let score = 0;

    if (
      (item.category || "").toLowerCase() === (newItem.category || "").toLowerCase() &&
      (item.category || "") !== ""
    ) score += 30;

    if (
      (item.location || "").toLowerCase() === (newItem.location || "").toLowerCase() &&
      (item.location || "") !== ""
    ) score += 30;

    if (
      (item.itemName || "").toLowerCase().includes((newItem.itemName || "").toLowerCase()) &&
      (newItem.itemName || "") !== ""
    ) score += 25;

    const dateDiff = Math.abs(new Date(item.date) - new Date(newItem.date));
    const days = dateDiff / (1000 * 60 * 60 * 24);

    if (days <= 2) score += 15;

    return score >= 50;
  });
}