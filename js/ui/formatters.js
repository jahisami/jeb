export function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function escapeHtml(value) {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
