export function getElement(target) {
  if (typeof target === "string") {
    return document.getElementById(target);
  }

  return target;
}

export function setText(target, value) {
  const element = getElement(target);

  if (element) {
    element.textContent = value;
  }
}

export function setHtml(target, value) {
  const element = getElement(target);

  if (element) {
    element.innerHTML = value;
  }
}

export function setHidden(target, hidden) {
  const element = getElement(target);

  if (element) {
    element.hidden = hidden;
  }
}

export function setDisabled(target, disabled) {
  const element = getElement(target);

  if (element) {
    element.disabled = disabled;
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

export function hideMessage(element) {
  if (!element) {
    return;
  }

  element.className = "result";
  element.textContent = "";
}
