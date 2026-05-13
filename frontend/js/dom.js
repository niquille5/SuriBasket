export function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function showMessage(element, type, message, allowHtml = false) {
  if (!element) {
    return;
  }

  element.className = "result show " + type;
  element.innerHTML = allowHtml
    ? "<strong>" + message + "</strong>"
    : "<strong>" + escapeHtml(message) + "</strong>";
}
