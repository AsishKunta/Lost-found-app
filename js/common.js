// js/common.js
const STORAGE_KEY = 'reports';

function getReports() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function setReports(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list || [])); }
function clearReports()    { localStorage.removeItem(STORAGE_KEY); }

function normalizeDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(s) {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y,m,d] = s.split("-");
    return `${m}/${d}/${y}`;          // MM/DD/YYYY
  }
  const dte = new Date(s);
  if (Number.isNaN(dte.getTime())) return s;
  const mm = String(dte.getMonth()+1).padStart(2,"0");
  const dd = String(dte.getDate()).padStart(2,"0");
  const yy = dte.getFullYear();
  return `${mm}/${dd}/${yy}`;
}

// Single export (includes formatter)
window.LFStore = {
  getReports,
  setReports,
  clearReports,
  normalizeDate,
  formatDisplayDate,
  STORAGE_KEY
};
