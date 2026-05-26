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

const ratingLabels = {
  5: "Heel goed",
  4: "Goed",
  3: "Redelijk",
  2: "Kan beter",
  1: "Niet goed",
};

document.addEventListener("DOMContentLoaded", () => {
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
  items.slice(0, 6).forEach((item) => {
    const score = Number(item.rating) || 0;
    const article = document.createElement("article");
    article.className = "testimonial-item " + getRatingClass(score);

    const header = document.createElement("div");
    header.className = "testimonial-header";

    const rating = document.createElement("div");
    rating.className = "testimonial-rating";
    rating.setAttribute("aria-label", score + " van 5 sterren");
    rating.textContent = "\u2605".repeat(score) + "\u2606".repeat(5 - score);

    const scoreBadge = document.createElement("span");
    scoreBadge.className = "testimonial-score";
    scoreBadge.textContent = score + "/5";

    const text = document.createElement("p");
    text.className = "testimonial-text";
    text.textContent = shortenText(item.message, 220);

    const footer = document.createElement("div");
    footer.className = "testimonial-footer";

    const author = document.createElement("span");
    author.className = "testimonial-author";
    author.textContent = item.name || "Anonieme gebruiker";

    const date = document.createElement("span");
    date.className = "testimonial-date";
    date.textContent = formatDate(item.created_at);

    header.append(rating, scoreBadge);
    footer.append(author, date);
    article.append(header, text, footer);
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

function getRatingClass(rating) {
  if (rating >= 4) return "is-positive";
  if (rating === 3) return "is-neutral";
  return "is-critical";
}

function formatDate(value) {
  if (!value) return "Net geplaatst";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Net geplaatst";

  return date.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}
