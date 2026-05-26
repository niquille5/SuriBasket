import { escapeHtml, getElement, setHtml, setHidden } from "./dom.js";

export function renderTableRows(target, items, renderRow, emptyHtml) {
  const element = getElement(target);
  if (!element) return;

  element.innerHTML = items.length ? items.map(renderRow).join("") : emptyHtml;
}

export function renderCards(target, items, renderCard, emptyHtml) {
  const element = getElement(target);
  if (!element) return;

  element.innerHTML = items.length ? items.map(renderCard).join("") : emptyHtml;
}

export function renderLoading(target, message, className = "muted") {
  setHtml(target, '<p class="' + escapeHtml(className) + '">' + escapeHtml(message) + "</p>");
}

export function renderEmptyState(message, className = "muted") {
  return '<p class="' + escapeHtml(className) + '">' + escapeHtml(message) + "</p>";
}

export function setModalOpen(target, isOpen) {
  setHidden(target, !isOpen);
}

export function setButtonLoading(button, isLoading, loadingText) {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.dataset.originalText || button.textContent;
    if (loadingText) button.textContent = loadingText;
    button.disabled = true;
    button.classList.add("is-loading");
    return;
  }

  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
  }
  button.disabled = false;
  button.classList.remove("is-loading");
}

export function showInlineMessage(target, type, message) {
  const element = getElement(target);
  if (!element) return;

  element.className = "admin-action-message show " + type;
  element.textContent = message;
}

export function hideInlineMessage(target) {
  const element = getElement(target);
  if (!element) return;

  element.className = "admin-action-message";
  element.textContent = "";
}
