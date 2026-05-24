// Configuration: use backend API base URL (localhost:3000 as per dashboard context)
    const API_BASE_URL = 'http://localhost:3000';
    let apiAvailable = false;

    // DOM elements
    const apiStatusSpan = document.getElementById('apiStatus');
    const healthIconSpan = document.getElementById('healthIcon');
    const healthMessageSpan = document.getElementById('healthMessage');
    const feedbackForm = document.getElementById('feedbackForm');
    const emailInput = document.getElementById('feedbackEmail');
    const ratingRadios = document.querySelectorAll('input[name="rating"]');
    const categorySelect = document.getElementById('feedbackCategory');
    const messageTextarea = document.getElementById('feedbackMessage');
    const charCountSpan = document.getElementById('charCount');
    const submitBtn = document.getElementById('submitFeedbackBtn');
    const resetBtn = document.getElementById('resetFormBtn');

    // Character counter update
    function updateCharCount() {
      const len = messageTextarea.value.length;
      charCountSpan.textContent = len;
      if (len > 900) {
        charCountSpan.style.color = '#e67e22';
      } else {
        charCountSpan.style.color = '#6b7280';
      }
    }
    if (messageTextarea) {
      messageTextarea.addEventListener('input', updateCharCount);
      updateCharCount();
    }

    // Reset form handling (without clearing rating UI easily)
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        feedbackForm.reset();
        // manually clear rating checkboxes reset doesn't clear radio UI in all browsers consistently
        ratingRadios.forEach(radio => radio.checked = false);
        updateCharCount();
        // also clear optional email
        if (emailInput) emailInput.value = '';
        if (categorySelect) categorySelect.value = '';
        if (messageTextarea) messageTextarea.value = '';
        updateCharCount();
        // reset any validation styles
        document.querySelectorAll('.form-group').forEach(g => g.classList.remove('error-shake'));
      });
    }

    // Helper: show toast message
    function showToast(message, type = 'success') {
      const existingToast = document.querySelector('.toast-message');
      if (existingToast) existingToast.remove();
      const toast = document.createElement('div');
      toast.className = `toast-message ${type}`;
      toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    // Shake animation for validation
    function shakeField(fieldElement) {
      if (!fieldElement) return;
      fieldElement.style.transform = 'translateX(4px)';
      setTimeout(() => { fieldElement.style.transform = ''; }, 200);
    }

    // Validation
    function validateFeedback() {
      let isValid = true;
      // rating validation: at least one checked
      const ratingSelected = Array.from(ratingRadios).some(r => r.checked);
      if (!ratingSelected) {
        showToast('Selecteer een waardering (1-5 sterren)', 'error');
        const ratingGroupDiv = document.querySelector('.rating-group');
        if (ratingGroupDiv) shakeField(ratingGroupDiv);
        isValid = false;
        return false;
      }
      // category
      const category = categorySelect.value;
      if (!category || category === '') {
        showToast('Kies een categorie voor de feedback', 'error');
        shakeField(categorySelect);
        isValid = false;
        return false;
      }
      // message: minimum 10 chars
      const msg = messageTextarea.value.trim();
      if (msg.length < 10) {
        showToast('Feedback bericht moet minimaal 10 karakters bevatten', 'error');
        shakeField(messageTextarea);
        isValid = false;
        return false;
      }
      if (msg.length > 1000) {
        showToast('Bericht mag maximaal 1000 karakters bevatten', 'error');
        isValid = false;
        return false;
      }
      return true;
    }

    // Submit feedback to database (POST /api/feedback)
    async function submitFeedbackToDB(payload) {
      // Using fetch with proper headers, expecting JSON response
      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }
      return await response.json();
    }

    // Main submit handler
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateFeedback()) return;

      // gather data
      const email = emailInput.value.trim() || null;
      let ratingValue = null;
      for (let radio of ratingRadios) {
        if (radio.checked) {
          ratingValue = parseInt(radio.value, 10);
          break;
        }
      }
      const category = categorySelect.value;
      const message = messageTextarea.value.trim();
      const userAgent = navigator.userAgent;

      const feedbackData = {
        email: email,
        rating: ratingValue,
        category: category,
        message: message,
        user_agent: userAgent,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Disable button to prevent double submission
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Versturen...';

      try {
        if (!apiAvailable) {
          console.warn('API health check indicates backend offline, but attempting submission...');
        }
        const result = await submitFeedbackToDB(feedbackData);
        showToast('Bedankt! Je feedback is opgeslagen in de database. 👍', 'success');
        // reset form after success
        feedbackForm.reset();
        ratingRadios.forEach(r => r.checked = false);
        if (messageTextarea) messageTextarea.value = '';
        if (emailInput) emailInput.value = '';
        if (categorySelect) categorySelect.value = '';
        updateCharCount();
        // optional: extra log
        console.log('Feedback saved:', result);
      } catch (err) {
        console.error('Feedback submission error:', err);
        showToast(`Fout bij opslaan: ${err.message}. Controleer of backend (localhost:3000) draait.`, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });

    // ========== API Health Check (align with dashboard "Backend verbinding") ==========
    async function checkAPIHealth() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          apiAvailable = true;
          if (apiStatusSpan) {
            apiStatusSpan.innerHTML = 'API online, database online';
            apiStatusSpan.style.color = '#f1f1f1';
          }
          if (healthIconSpan) healthIconSpan.innerHTML = '🟢';
          if (healthMessageSpan) healthMessageSpan.innerHTML = 'Backend actief — database gereed voor feedback.';
        } else {
          throw new Error('Health endpoint not ok');
        }
      } catch (err) {
        apiAvailable = false;
        if (apiStatusSpan) {
          apiStatusSpan.innerHTML = 'Geen verbinding met localhost:3000';
          apiStatusSpan.style.color = '#ffffff';
        }
        if (healthIconSpan) healthIconSpan.innerHTML = '🔴';
        if (healthMessageSpan) healthMessageSpan.innerHTML = 'Geen verbinding met localhost:3000. Feedback wordt lokaal opgeslagen? Nee, databaseopslag vereist backend.';
        console.warn('API health check failed', err);
      }
    }

    // Initialize API health
    checkAPIHealth();
    // Poll every 30s for status
    setInterval(checkAPIHealth, 30000);

    // style active nav link
    document.querySelectorAll('.nav-links a').forEach(link => {
      if (link.getAttribute('href') === 'feedback.html') {
        link.classList.add('active');
        link.style.fontWeight = 'bold';
        link.style.borderBottom = '2px solid var(--primary)';
      }
    });
    
    const handleRatingDisplay = () => {};