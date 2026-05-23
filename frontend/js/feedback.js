// API Configuration
const API_BASE_URL = 'http://localhost:3000'; // Change to your backend URL
const API_ENDPOINTS = {
    submit: `${API_BASE_URL}/api/feedback`,
    stats: `${API_BASE_URL}/api/feedback/stats`
};

// DOM Elements
const form = document.getElementById('feedbackForm');
const submitBtn = document.getElementById('submitBtn');
const alertDiv = document.getElementById('alertMessage');
const charCounter = document.getElementById('charCounter');
const messageField = document.getElementById('message');
const starRatingInputs = document.querySelectorAll('input[name="rating"]');
const ratingText = document.getElementById('ratingText');
const issueTypeGroup = document.getElementById('issueTypeGroup');
const fileUploadArea = document.getElementById('fileUploadArea');
const screenshotInput = document.getElementById('screenshot');
const screenshotPreview = document.getElementById('screenshotPreview');
const previewImg = document.getElementById('previewImg');
const removeScreenshotBtn = document.getElementById('removeScreenshot');

// Helper Functions
function showAlert(message, type = 'success') {
    alertDiv.className = `alert ${type}`;
    alertDiv.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    alertDiv.style.display = 'flex';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

function hideAlert() {
    alertDiv.style.display = 'none';
}

function setLoading(isLoading) {
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
        submitBtn.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

function updateCharCount() {
    const length = messageField.value.length;
    const charCountSpan = document.getElementById('charCount');
    charCountSpan.textContent = length;
    
    if (length > 800) {
        charCounter.classList.add('warning');
    } else {
        charCounter.classList.remove('warning');
    }
    
    if (length > 950) {
        charCounter.classList.add('danger');
    } else {
        charCounter.classList.remove('danger');
    }
}

function updateRatingText(rating) {
    const ratingMap = {
        5: 'Excellent! ⭐⭐⭐⭐⭐',
        4: 'Good! ⭐⭐⭐⭐',
        3: 'Average ⭐⭐⭐',
        2: 'Poor ⭐⭐',
        1: 'Terrible ⭐'
    };
    ratingText.textContent = ratingMap[rating] || 'Select a rating';
}

function showIssueTypeField() {
    const selectedRating = document.querySelector('input[name="rating"]:checked');
    if (selectedRating && parseInt(selectedRating.value) <= 3) {
        issueTypeGroup.style.display = 'block';
    } else {
        issueTypeGroup.style.display = 'none';
        document.getElementById('issueType').value = '';
    }
}

async function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            reject(new Error('File size must be less than 5MB'));
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            reject(new Error('Only image files are allowed'));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Event Listeners
messageField.addEventListener('input', updateCharCount);

starRatingInputs.forEach(input => {
    input.addEventListener('change', function() {
        updateRatingText(this.value);
        showIssueTypeField();
    });
});

// File upload handling
fileUploadArea.addEventListener('click', () => {
    screenshotInput.click();
});

screenshotInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            screenshotPreview.style.display = 'block';
            fileUploadArea.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
});

removeScreenshotBtn.addEventListener('click', () => {
    screenshotInput.value = '';
    screenshotPreview.style.display = 'none';
    fileUploadArea.style.display = 'block';
});

// Drag and drop upload
fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.style.borderColor = 'var(--primary-color)';
    fileUploadArea.style.background = 'var(--light-gray)';
});

fileUploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    fileUploadArea.style.borderColor = 'var(--light-gray)';
    fileUploadArea.style.background = 'transparent';
});

fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        screenshotInput.files = e.dataTransfer.files;
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            screenshotPreview.style.display = 'block';
            fileUploadArea.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
    fileUploadArea.style.borderColor = 'var(--light-gray)';
    fileUploadArea.style.background = 'transparent';
});

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    
    // Validate rating
    const selectedRating = document.querySelector('input[name="rating"]:checked');
    if (!selectedRating) {
        showAlert('Please select a rating', 'error');
        return;
    }
    
    // Validate email
    const email = document.getElementById('email').value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }
    
    // Validate message
    const message = document.getElementById('message').value.trim();
    if (!message) {
        showAlert('Please enter your feedback message', 'error');
        return;
    }
    
    // Validate page selection
    const page = document.getElementById('page').value;
    if (!page) {
        showAlert('Please select which page you were on', 'error');
        return;
    }
    
    setLoading(true);
    
    try {
        // Get browser info
        const browserInfo = navigator.userAgent;
        const referrer = document.referrer || 'Direct visit';
        
        // Convert screenshot to base64 if exists
        let screenshotBase64 = null;
        if (screenshotInput.files[0]) {
            try {
                screenshotBase64 = await convertImageToBase64(screenshotInput.files[0]);
            } catch (uploadError) {
                showAlert(uploadError.message, 'error');
                setLoading(false);
                return;
            }
        }
        
        // Prepare feedback data
        const feedbackData = {
            name: document.getElementById('name').value.trim() || null,
            email: email,
            rating: parseInt(selectedRating.value),
            message: message,
            page: page,
            issueType: document.getElementById('issueType').value || null,
            browserInfo: browserInfo,
            referrer: referrer,
            screenshot: screenshotBase64
        };
        
        // Submit to backend
        const response = await fetch(API_ENDPOINTS.submit, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(feedbackData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showAlert('✓ Thank you! Your feedback has been submitted successfully.', 'success');
            form.reset();
            
            // Reset UI
            document.querySelectorAll('input[name="rating"]').forEach(r => r.checked = false);
            ratingText.textContent = 'Select a rating';
            document.getElementById('charCount').textContent = '0';
            charCounter.classList.remove('warning', 'danger');
            screenshotPreview.style.display = 'none';
            fileUploadArea.style.display = 'block';
            issueTypeGroup.style.display = 'none';
            
            // Redirect to thank you page after 2 seconds
            setTimeout(() => {
                window.location.href = '/thank-you.html';
            }, 2000);
        } else {
            throw new Error(result.message || 'Submission failed');
        }
    } catch (error) {
        console.error('Submission error:', error);
        showAlert(error.message || 'Sorry, something went wrong. Please try again or contact support.', 'error');
    } finally {
        setLoading(false);
    }
});

// Load statistics and testimonials
async function loadStats() {
    try {
        const response = await fetch(API_ENDPOINTS.stats);
        const data = await response.json();
        
        if (data.success) {
            // Update stats badge
            const avgRating = document.getElementById('avgRating');
            const totalFeedback = document.getElementById('totalFeedback');
            
            if (avgRating) avgRating.textContent = `${data.stats.average_rating} ★`;
            if (totalFeedback) totalFeedback.textContent = data.stats.total_feedback;
            
            // Load testimonials
            const testimonialsList = document.getElementById('testimonialsList');
            if (testimonialsList && data.testimonials && data.testimonials.length > 0) {
                testimonialsList.innerHTML = '';
                data.testimonials.forEach(testimonial => {
                    const testimonialDiv = document.createElement('div');
                    testimonialDiv.className = 'testimonial-item';
                    testimonialDiv.innerHTML = `
                        <div class="testimonial-rating">
                            ${'★'.repeat(testimonial.rating)}${'☆'.repeat(5 - testimonial.rating)}
                        </div>
                        <div class="testimonial-text">"${testimonial.message.substring(0, 150)}${testimonial.message.length > 150 ? '...' : ''}"</div>
                        <div class="testimonial-author">— ${testimonial.name || 'Anonymous'}</div>
                    `;
                    testimonialsList.appendChild(testimonialDiv);
                });
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        const statsBadge = document.getElementById('statsBadge');
        if (statsBadge) {
            statsBadge.innerHTML = '<i class="fas fa-chart-line"></i> Loading stats...';
        }
    }
}

// Auto-fill page from URL parameter
function autoFillPageFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam) {
        const pageSelect = document.getElementById('page');
        if (pageSelect && [...pageSelect.options].some(opt => opt.value === pageParam)) {
            pageSelect.value = pageParam;
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    autoFillPageFromUrl();
    updateCharCount();
    
    // Add animation to form elements
    const formElements = document.querySelectorAll('.form-group');
    formElements.forEach((el, index) => {
        el.style.animation = `fadeIn 0.3s ease-out ${index * 0.05}s forwards`;
        el.style.opacity = '0';
    });
});