// =============================================================
// SMART MATCHING SERVICE
// Provides findMatches() to score existing submissions against
// a newly submitted item. No DOM access — pure logic only.
// =============================================================

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------

/**
 * Returns true if strings a and b share at least one
 * meaningful word (length > 1, not a common stop word).
 */
function wordOverlap(a, b) {
  const stopWords = new Set([
    "a", "an", "the", "at", "in", "on", "of", "for",
    "with", "near", "my", "is", "it", "to", "and", "or"
  ]);

  const tokenize = (str) =>
    (str || "")
      .toLowerCase()
      .split(/[\s,.\-_/]+/)
      .filter((w) => w.length > 1 && !stopWords.has(w));

  const wordsA = tokenize(a);
  const wordsB = new Set(tokenize(b));

  return wordsA.some((w) => wordsB.has(w));
}

/**
 * Returns absolute difference in days between two date strings.
 * Handles invalid dates gracefully (returns Infinity).
 */
function dateDiffDays(d1, d2) {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();

  if (isNaN(t1) || isNaN(t2)) return Infinity;

  return Math.abs(t1 - t2) / (1000 * 60 * 60 * 24);
}

// -------------------------------------------------------------
// MAIN MATCHING FUNCTION
// -------------------------------------------------------------

/**
 * Scores each item in allItems against newItem and returns
 * those that score >= 50, sorted highest score first.
 *
 * Scoring weights:
 *   category match    → +30
 *   location overlap  → +30
 *   name overlap      → +25
 *   date within 2 days→ +15
 *
 * @param {Object}   newItem  - The item just submitted (must have an id)
 * @param {Object[]} allItems - All items fetched from /submissions
 * @returns {Object[]} Matched items, each with an added `matchScore` field
 */
function findMatches(newItem, allItems) {
  console.log("findMatches › newItem:", newItem);

  const results = [];

  for (const item of allItems) {
    // Skip the newly submitted item itself
    if (String(item.id) === String(newItem.id)) continue;

    let score = 0;

    // Category match (+30)
    if (
      (item.category || "").toLowerCase() === (newItem.category || "").toLowerCase() &&
      (item.category || "").toLowerCase() !== ""
    ) {
      score += 30;
    }

    // Location overlap (+30)
    if (wordOverlap(item.location || "", newItem.location || "")) {
      score += 30;
    }

    // Item name / title similarity (+25)
    const itemTitle = item.title || item.itemName || "";
    const newTitle  = newItem.title || newItem.itemName || "";
    if (wordOverlap(itemTitle, newTitle)) {
      score += 25;
    }

    // Description overlap (+10)
    if (wordOverlap(item.description || "", newItem.description || "")) {
      score += 10;
    }

    // Date within 2 days (+15)
    const itemDate = item.date || item.dateFound || "";
    const newDate  = newItem.date || newItem.dateFound || "";
    if (itemDate && newDate && dateDiffDays(itemDate, newDate) <= 2) {
      score += 15;
    }

    // Only include items that meet the minimum threshold
    if (score >= 50) {
      results.push({ ...item, matchScore: score });
    }
  }

  // Sort highest score first
  const sorted = results.sort((a, b) => b.matchScore - a.matchScore);
  console.log("findMatches › matches:", sorted);
  return sorted;
}
