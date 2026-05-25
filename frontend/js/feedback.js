const feedbackApi = {
  submit: "/api/feedback",
  stats: "/api/feedback/stats",
};

const form = document.getElementById("feedbackForm");
const submitButton = document.getElementById("submitBtn");
const alertBox = document.getElementById("alertMessage");
const messageField = document.getElementById("message");
const charCounter = document.getElementById("charCounter");
const ratingText = document.getElementById("ratingText");
const issueTypeGroup = document.getElementById("issueTypeGroup");
const fileUploadArea = document.getElementById("fileUploadArea");
const screenshotInput = document.getElementById("screenshot");
const screenshotPreview = document.getElementById("screenshotPreview");
const previewImage = document.getElementById("previewImg");
const removeScreenshotButton = document.getElementById("removeScreenshot");

const ratingLabels = {
  5: "Heel goed",
  4: "Goed",
  3: "Redelijk",
  2: "Kan beter",
  1: "Niet goed",
};

export function initFeedbackPage() {
  bindFeedbackForm();
  loadFeedbackStats();
  fillPageFromUrl();
  updateCharCount();
});

function bindFeedbackForm() {
  if (!form) return;

  messageField?.addEventListener("input", updateCharCount);

  document.querySelectorAll('input[name="rating"]').forEach((input) => {
    input.addEventListener("change", () => {
      updateRatingText(input.value);
      toggleIssueType(input.value);
    });
  });

  fileUploadArea?.addEventListener("click", () => screenshotInput?.click());
  fileUploadArea?.addEventListener("dragover", handleDragOver);
  fileUploadArea?.addEventListener("dragleave", clearDragState);
  fileUploadArea?.addEventListener("drop", handleFileDrop);
  screenshotInput?.addEventListener("change", () =>
    showScreenshotPreview(screenshotInput.files[0]),
  );
  removeScreenshotButton?.addEventListener("click", removeScreenshot);

  form.addEventListener("submit", submitFeedback);
}

async function submitFeedback(event) {
  event.preventDefault();
  hideAlert();

  const selectedRating = document.querySelector('input[name="rating"]:checked');
  const email = document.getElementById("email").value.trim();
  const message = messageField.value.trim();
  const page = document.getElementById("page").value;

  if (!selectedRating) {
    showAlert("Kies eerst een beoordeling.", "error");
    return;
  }

  if (!isValidEmail(email)) {
    showAlert("Vul een geldig e-mailadres in.", "error");
    return;
  }

  if (!page) {
    showAlert("Kies over welke pagina je feedback gaat.", "error");
    return;
  }

  if (!message) {
    showAlert("Schrijf kort wat je wilt doorgeven.", "error");
    return;
  }

  setLoading(true);

  try {
    const screenshot = await getScreenshotData();
    const response = await fetch(feedbackApi.submit, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.getElementById("name").value.trim() || null,
        email,
        rating: Number(selectedRating.value),
        page,
        issueType: document.getElementById("issueType").value || null,
        message,
        browserInfo: navigator.userAgent,
        referrer: document.referrer || "Direct bezoek",
        screenshot,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Versturen lukt nu niet.");

    showAlert("Dank je. Je feedback is verstuurd.", "success");
    resetForm();
    loadFeedbackStats();
  } catch (error) {
    showAlert(
      error.message ||
        "Feedback kon niet worden verstuurd. Controleer of de backend aan staat.",
      "error",
    );
  } finally {
    setLoading(false);
  }
}

async function loadFeedbackStats() {
  try {
    const response = await fetch(feedbackApi.stats);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error("Geen feedbackstatistiek.");

    setText("avgRating", formatRating(data.stats.average_rating));
    setText("totalFeedback", data.stats.total_feedback || 0);
    renderTestimonials(data.testimonials || []);
  } catch (error) {
    setText("avgRating", "Nog geen score");
    setText("totalFeedback", "0");
    renderTestimonials([]);
  }
}

function renderTestimonials(items) {
  const list = document.getElementById("testimonialsList");
  if (!list) return;

  if (!items.length) {
    list.innerHTML = '<p class="muted">Nog geen reacties geladen.</p>';
    return;
  }

  list.innerHTML = "";
  items.slice(0, 3).forEach((item) => {
    const article = document.createElement("article");
    article.className = "testimonial-item";

    const rating = document.createElement("div");
    rating.className = "testimonial-rating";
    rating.textContent = "★".repeat(item.rating) + "☆".repeat(5 - item.rating);

    const text = document.createElement("p");
    text.className = "testimonial-text";
    text.textContent = shortenText(item.message, 150);

    const author = document.createElement("span");
    author.className = "testimonial-author";
    author.textContent = item.name || "Anonieme gebruiker";

    article.append(rating, text, author);
    list.appendChild(article);
  });
}

function updateCharCount() {
  if (!messageField || !charCounter) return;

  const count = messageField.value.length;
  setText("charCount", count);
  charCounter.classList.toggle("warning", count > 800);
  charCounter.classList.toggle("danger", count > 950);
}

function updateRatingText(value) {
  if (ratingText) ratingText.textContent = ratingLabels[value] || "Kies een score";
}

function toggleIssueType(value) {
  if (!issueTypeGroup) return;

  const shouldShow = Number(value) <= 3;
  issueTypeGroup.hidden = !shouldShow;
  if (!shouldShow) document.getElementById("issueType").value = "";
}

function handleDragOver(event) {
  event.preventDefault();
  fileUploadArea.classList.add("is-dragging");
}

function clearDragState(event) {
  event.preventDefault();
  fileUploadArea.classList.remove("is-dragging");
}

function handleFileDrop(event) {
  event.preventDefault();
  fileUploadArea.classList.remove("is-dragging");

  const file = event.dataTransfer.files[0];
  if (!file || !file.type.startsWith("image/")) return;

  screenshotInput.files = event.dataTransfer.files;
  showScreenshotPreview(file);
}

function showScreenshotPreview(file) {
  if (!file || !previewImage || !screenshotPreview) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    previewImage.src = event.target.result;
    screenshotPreview.hidden = false;
    fileUploadArea.hidden = true;
  };
  reader.readAsDataURL(file);
}

function removeScreenshot() {
  screenshotInput.value = "";
  screenshotPreview.hidden = true;
  fileUploadArea.hidden = false;
}

async function getScreenshotData() {
  const file = screenshotInput?.files[0];
  if (!file) return null;

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("De screenshot mag maximaal 5MB zijn.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Upload alleen een afbeelding.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Screenshot kon niet worden gelezen."));
    reader.readAsDataURL(file);
  });
}

function setLoading(isLoading) {
  const text = submitButton?.querySelector(".btn-text");
  const loading = submitButton?.querySelector(".btn-loading");

  if (!submitButton || !text || !loading) return;

  submitButton.disabled = isLoading;
  text.hidden = isLoading;
  loading.hidden = !isLoading;
}

function resetForm() {
  form.reset();
  updateRatingText("");
  updateCharCount();
  issueTypeGroup.hidden = true;
  removeScreenshot();
}

function showAlert(message, type = "success") {
  if (!alertBox) return;

  alertBox.className = "alert " + type;
  alertBox.textContent = message;
  alertBox.style.display = "block";
}

function hideAlert() {
  if (alertBox) alertBox.style.display = "none";
}

function fillPageFromUrl() {
  const page = new URLSearchParams(window.location.search).get("page");
  const select = document.getElementById("page");
  if (!page || !select) return;

  const exists = [...select.options].some((option) => option.value === page);
  if (exists) select.value = page;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatRating(value) {
  const rating = Number(value);
  if (!rating) return "Nog geen score";
  return rating.toFixed(1) + " / 5";
}

function shortenText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}
