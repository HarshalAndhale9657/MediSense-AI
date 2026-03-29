// ============================================
// MediSense AI — Frontend Application
// ============================================

// State Management
const state = {
    currentSection: 'home',
    medications: [],
    chatMessages: [],
    analysisHistory: JSON.parse(localStorage.getItem('medisense_history') || '[]'),
    uploadedImage: null,
    uploadedImageBase64: null,
    skinImageBase64: null
};

// ============================================
// Navigation
// ============================================
function navigateTo(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    // Show target
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        // Re-trigger animation
        target.style.animation = 'none';
        target.offsetHeight; // force reflow
        target.style.animation = '';
    }
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');
    
    state.currentSection = sectionId;
    window.location.hash = sectionId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Init navigation from hash
function initNavigation() {
    const hash = window.location.hash.replace('#', '') || 'home';
    navigateTo(hash);
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.section);
        });
    });
    
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '') || 'home';
        navigateTo(hash);
    });
}

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// Loading Overlay
// ============================================
function showLoading(text = 'Analyzing with AI...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (loadingText) loadingText.textContent = text;
    if (overlay) overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

// ============================================
// Stats Counter Animation
// ============================================
function animateStats() {
    const stats = document.querySelectorAll('.stat-number[data-count]');
    stats.forEach(stat => {
        const target = parseInt(stat.dataset.count);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            stat.textContent = Math.floor(current).toLocaleString();
        }, 16);
    });
}

// ============================================
// Symptom Analyzer
// ============================================
function addSymptom(symptom) {
    const input = document.getElementById('symptomInput');
    if (!input) return;
    const current = input.value.trim();
    input.value = current ? `${current}, ${symptom}` : symptom;
    input.focus();
}

async function analyzeSymptoms() {
    const input = document.getElementById('symptomInput');
    const symptoms = input?.value.trim();
    
    if (!symptoms) {
        showToast('Please describe your symptoms first.', 'warning');
        return;
    }
    
    showLoading('Analyzing your symptoms...');
    
    try {
        const res = await fetch('/api/analyze-symptoms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symptoms })
        });
        
        if (!res.ok) throw new Error('Analysis failed');
        const data = await res.json();
        
        renderSymptomResults(data);
        saveToHistory('symptom', symptoms, data);
        
        // Auto-detect emergency
        if (data.severity === 'Emergency') {
            showToast('⚠️ EMERGENCY DETECTED — Please call emergency services immediately!', 'error', 10000);
        }
        
    } catch (error) {
        showToast('Analysis failed. Please check your connection and try again.', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

function renderSymptomResults(data) {
    const panel = document.getElementById('symptomResults');
    if (!panel) return;
    
    const severityClass = `severity-${(data.severity || 'low').toLowerCase()}`;
    const severityIcons = { Low: 'fa-shield-alt', Moderate: 'fa-exclamation', High: 'fa-exclamation-triangle', Emergency: 'fa-ambulance' };
    
    let conditionsHTML = '';
    if (data.possibleConditions) {
        conditionsHTML = data.possibleConditions.map(c => `
            <div class="condition-card">
                <div class="condition-header">
                    <span class="condition-name">${c.name}</span>
                    <span class="likelihood-badge likelihood-${(c.likelihood || 'medium').toLowerCase()}">${c.likelihood}</span>
                </div>
                <div class="condition-desc">${c.description}</div>
            </div>
        `).join('');
    }
    
    let recsHTML = '';
    if (data.recommendations) {
        recsHTML = data.recommendations.map(r => `<li>${r}</li>`).join('');
    }
    
    let followupHTML = '';
    if (data.followUpQuestions) {
        followupHTML = data.followUpQuestions.map(q => `<li>${q}</li>`).join('');
    }
    
    panel.innerHTML = `
        <div class="result-content">
            <div class="result-header-row">
                <span class="severity-badge ${severityClass}">
                    <i class="fas ${severityIcons[data.severity] || 'fa-info-circle'}"></i> ${data.severity} Severity
                </span>
                <button class="btn btn-glass btn-sm" onclick="exportResults('symptom')">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
            
            <div class="result-summary">${data.summary || ''}</div>
            
            ${conditionsHTML ? `
            <div class="result-section">
                <div class="result-section-title"><i class="fas fa-list-ul"></i> Possible Conditions</div>
                ${conditionsHTML}
            </div>` : ''}
            
            ${recsHTML ? `
            <div class="result-section">
                <div class="result-section-title"><i class="fas fa-clipboard-check"></i> Recommendations</div>
                <ul class="recommendation-list">${recsHTML}</ul>
            </div>` : ''}
            
            ${followupHTML ? `
            <div class="result-section">
                <div class="result-section-title"><i class="fas fa-question-circle"></i> Follow-up Questions</div>
                <ul class="followup-list">${followupHTML}</ul>
            </div>` : ''}
            
            <div class="disclaimer-box">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${data.disclaimer || 'This is not a medical diagnosis. Please consult a healthcare professional.'}</span>
            </div>
        </div>
    `;
}

// ============================================
// Report Explainer (with Image Support)
// ============================================
function initImageUpload() {
    const dropzone = document.getElementById('imageDropzone');
    const fileInput = document.getElementById('reportImageInput');
    
    if (!dropzone || !fileInput) return;
    
    dropzone.addEventListener('click', () => fileInput.click());
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleImageFile(file);
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageFile(file);
    });
}

function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file (JPG, PNG, etc.)', 'warning');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('Image too large. Max 10MB.', 'warning');
        return;
    }
    
    state.uploadedImage = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        state.uploadedImageBase64 = e.target.result;
        const preview = document.getElementById('imagePreview');
        const dropzone = document.getElementById('imageDropzone');
        if (preview) {
            preview.innerHTML = `
                <div class="image-preview-card">
                    <img src="${e.target.result}" alt="Uploaded report">
                    <div class="image-preview-info">
                        <span><i class="fas fa-file-image"></i> ${file.name}</span>
                        <button class="btn-remove-image" onclick="removeImage()"><i class="fas fa-times"></i> Remove</button>
                    </div>
                </div>
            `;
            preview.style.display = 'block';
        }
        if (dropzone) dropzone.style.display = 'none';
        showToast('Image uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    state.uploadedImage = null;
    state.uploadedImageBase64 = null;
    const preview = document.getElementById('imagePreview');
    const dropzone = document.getElementById('imageDropzone');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
    if (dropzone) dropzone.style.display = 'flex';
    const fileInput = document.getElementById('reportImageInput');
    if (fileInput) fileInput.value = '';
}

async function explainReport() {
    const reportText = document.getElementById('reportInput')?.value.trim();
    const hasImage = !!state.uploadedImageBase64;
    
    if (!reportText && !hasImage) {
        showToast('Please paste your report text or upload an image.', 'warning');
        return;
    }
    
    showLoading('Analyzing your medical report...');
    
    try {
        let data;
        
        if (hasImage) {
            const res = await fetch('/api/explain-report-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    imageBase64: state.uploadedImageBase64,
                    additionalText: reportText || ''
                })
            });
            if (!res.ok) throw new Error('Image analysis failed');
            data = await res.json();
        } else {
            const res = await fetch('/api/explain-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportText })
            });
            if (!res.ok) throw new Error('Analysis failed');
            data = await res.json();
        }
        
        renderReportResults(data);
        saveToHistory('report', reportText || 'Image Upload', data);
        
    } catch (error) {
        showToast('Report analysis failed. Please try again.', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

function renderReportResults(data) {
    const panel = document.getElementById('reportResults');
    if (!panel) return;
    
    let metricsHTML = '';
    if (data.metrics && data.metrics.length) {
        metricsHTML = data.metrics.map(m => {
            const statusClass = `status-${(m.status || 'normal').toLowerCase()}`;
            return `
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-name">${m.name}</span>
                        <span class="metric-status ${statusClass}">${m.status}</span>
                    </div>
                    <div class="metric-details">
                        <span class="metric-value">Value: ${m.value}</span>
                        <span>Normal: ${m.normalRange}</span>
                    </div>
                    <div class="metric-explanation">${m.explanation}</div>
                </div>
            `;
        }).join('');
    }
    
    let concernsHTML = '';
    if (data.concerns && data.concerns.length) {
        concernsHTML = data.concerns.map(c => `<li>${c}</li>`).join('');
    }
    
    let recsHTML = '';
    if (data.recommendations && data.recommendations.length) {
        recsHTML = data.recommendations.map(r => `<li>${r}</li>`).join('');
    }
    
    panel.innerHTML = `
        <div class="result-content">
            <div class="result-header-row">
                <span class="report-type-badge"><i class="fas fa-file-medical"></i> ${data.reportType || 'Medical Report'}</span>
                <button class="btn btn-glass btn-sm" onclick="exportResults('report')">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
            
            <div class="result-summary">${data.summary || ''}</div>
            
            ${metricsHTML ? `
            <div class="result-section">
                <div class="result-section-title"><i class="fas fa-chart-bar"></i> Metrics Breakdown</div>
                ${metricsHTML}
            </div>` : ''}
            
            ${concernsHTML ? `
            <div class="result-section">
                <div class="result-section-title"><i class="fas fa-exclamation-circle"></i> Concerns</div>
                <ul class="recommendation-list">${concernsHTML}</ul>
            </div>` : ''}
            
            ${recsHTML ? `
            <div class="result-section">
                <div class="result-section-title"><i class="fas fa-clipboard-check"></i> Recommendations</div>
                <ul class="recommendation-list">${recsHTML}</ul>
            </div>` : ''}
            
            <div class="disclaimer-box">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${data.disclaimer || 'This is not a medical diagnosis. Please consult a healthcare professional.'}</span>
            </div>
        </div>
    `;
}

// ============================================
// Drug Interaction Checker
// ============================================
function addDrug() {
    const input = document.getElementById('drugInput');
    const name = input?.value.trim();
    if (!name) return;
    
    if (state.medications.includes(name)) {
        showToast('Medication already added.', 'warning');
        return;
    }
    
    state.medications.push(name);
    input.value = '';
    input.focus();
    renderDrugList();
}

function addDrugDirect(name) {
    if (state.medications.includes(name)) {
        showToast('Medication already added.', 'warning');
        return;
    }
    state.medications.push(name);
    renderDrugList();
}

function removeDrug(name) {
    state.medications = state.medications.filter(d => d !== name);
    renderDrugList();
}

function renderDrugList() {
    const container = document.getElementById('drugList');
    if (!container) return;
    
    container.innerHTML = state.medications.map(drug => `
        <div class="drug-chip">
            <i class="fas fa-capsules"></i> ${drug}
            <button class="remove-drug" onclick="removeDrug('${drug.replace(/'/g, "\\'")}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

async function checkInteractions() {
    if (state.medications.length < 2) {
        showToast('Add at least 2 medications to check interactions.', 'warning');
        return;
    }
    
    showLoading('Checking drug interactions...');
    
    try {
        const res = await fetch('/api/check-interactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ medications: state.medications })
        });
        
        if (!res.ok) throw new Error('Check failed');
        const data = await res.json();
        
        renderDrugResults(data);
        saveToHistory('drug', state.medications.join(', '), data);
        
    } catch (error) {
        showToast('Interaction check failed. Please try again.', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

function renderDrugResults(data) {
    const panel = document.getElementById('drugResults');
    if (!panel) return;
    
    const safeClass = data.safeToTakeTogether ? 'safety-safe' : 'safety-unsafe';
    const safeIcon = data.safeToTakeTogether ? 'fa-check-circle' : 'fa-exclamation-triangle';
    const safeText = data.safeToTakeTogether ? 'Generally Safe Together' : 'Potential Interactions Found';
    
    let interactionsHTML = '';
    if (data.interactions && data.interactions.length) {
        interactionsHTML = data.interactions.map(i => {
            const sevClass = `status-${i.severity?.toLowerCase() === 'none' || i.severity?.toLowerCase() === 'mild' ? 'normal' : i.severity?.toLowerCase() === 'moderate' ? 'borderline' : 'abnormal'}`;
            return `
                <div class="interaction-card">
                    <div class="interaction-drugs"><i class="fas fa-pills"></i> ${i.drugs?.join(' + ') || ''}</div>
                    <span class="interaction-severity ${sevClass}">${i.severity}</span>
                    <div class="interaction-desc">${i.description}</div>
                    <div class="interaction-mechanism"><strong>Mechanism:</strong> ${i.mechanism}</div>
                    <div class="interaction-rec"><i class="fas fa-lightbulb"></i> ${i.recommendation}</div>
                </div>
            `;
        }).join('');
    }
    
    panel.innerHTML = `
        <div class="result-content">
            <div class="result-header-row">
                <span class="safety-badge ${safeClass}">
                    <i class="fas ${safeIcon}"></i> ${safeText}
                </span>
                <button class="btn btn-glass btn-sm" onclick="exportResults('drug')">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
            
            ${data.generalAdvice ? `<div class="result-summary">${data.generalAdvice}</div>` : ''}
            
            ${interactionsHTML ? `
            <div class="result-section">
                <div class="result-section-title"><i class="fas fa-exchange-alt"></i> Interactions Found</div>
                ${interactionsHTML}
            </div>` : ''}
            
            <div class="disclaimer-box">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${data.disclaimer || 'Always consult your pharmacist or doctor before changing medications.'}</span>
            </div>
        </div>
    `;
}

// ============================================
// Health Chat
// ============================================
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input?.value.trim();
    if (!message) return;
    
    input.value = '';
    addChatBubble(message, 'user');
    
    state.chatMessages.push({ role: 'user', content: message });
    
    // Show typing indicator
    const typingId = addTypingIndicator();
    
    try {
        const res = await fetch('/api/health-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: state.chatMessages })
        });
        
        if (!res.ok) throw new Error('Chat failed');
        const data = await res.json();
        
        removeTypingIndicator(typingId);
        addChatBubble(data.reply, 'ai');
        state.chatMessages.push({ role: 'assistant', content: data.reply });
        
    } catch (error) {
        removeTypingIndicator(typingId);
        addChatBubble('Sorry, I encountered an error. Please try again.', 'ai');
        showToast('Chat failed. Please try again.', 'error');
        console.error(error);
    }
}

function sendSuggestion(text) {
    const input = document.getElementById('chatInput');
    if (input) input.value = text;
    sendMessage();
}

function addChatBubble(content, type) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    
    const avatarIcon = type === 'ai' ? 'fa-robot' : 'fa-user';
    
    // Convert markdown-like formatting to HTML
    let formattedContent = content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    bubble.innerHTML = `
        <div class="bubble-avatar"><i class="fas ${avatarIcon}"></i></div>
        <div class="bubble-content"><p>${formattedContent}</p></div>
    `;
    
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

function addTypingIndicator() {
    const container = document.getElementById('chatMessages');
    if (!container) return null;
    
    const id = 'typing-' + Date.now();
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ai';
    bubble.id = id;
    bubble.innerHTML = `
        <div class="bubble-avatar"><i class="fas fa-robot"></i></div>
        <div class="bubble-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ============================================
// Emergency SOS
// ============================================
async function emergencyAssess() {
    const input = document.getElementById('emergencyInput');
    const situation = input?.value.trim();
    
    if (!situation) {
        showToast('Please describe the emergency situation.', 'warning');
        return;
    }
    
    showLoading('⚠️ Emergency Assessment in Progress...');
    
    try {
        const res = await fetch('/api/emergency-assess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ situation })
        });
        
        if (!res.ok) throw new Error('Assessment failed');
        const data = await res.json();
        
        renderEmergencyResults(data);
        
    } catch (error) {
        showToast('Emergency assessment failed. CALL 911/112 IMMEDIATELY if this is a real emergency.', 'error', 10000);
        console.error(error);
    } finally {
        hideLoading();
    }
}

function renderEmergencyResults(data) {
    const panel = document.getElementById('emergencyResults');
    if (!panel) return;
    
    const levelColors = { Critical: '#dc2626', High: '#ef4444', Moderate: '#f59e0b', Low: '#22c55e' };
    const levelColor = levelColors[data.urgencyLevel] || '#ef4444';
    
    let stepsHTML = '';
    if (data.immediateSteps) {
        stepsHTML = data.immediateSteps.map((step, i) => `
            <div class="emergency-step">
                <div class="step-number">${i + 1}</div>
                <div class="step-content">${step}</div>
            </div>
        `).join('');
    }
    
    let warningsHTML = '';
    if (data.doNotDo) {
        warningsHTML = data.doNotDo.map(w => `
            <div class="warning-item"><i class="fas fa-ban"></i> ${w}</div>
        `).join('');
    }
    
    panel.innerHTML = `
        <div class="result-content">
            <div class="emergency-level" style="border-color: ${levelColor}; color: ${levelColor}; background: ${levelColor}15;">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Urgency: ${data.urgencyLevel || 'High'}</span>
            </div>
            
            ${data.callEmergency ? `
            <div class="call-emergency-banner">
                <i class="fas fa-phone-alt"></i>
                <div>
                    <strong>CALL EMERGENCY SERVICES NOW</strong>
                    <span>Dial 911 (US) / 112 (EU) / 108 (India) immediately</span>
                </div>
            </div>` : ''}
            
            <div class="result-summary">${data.assessment || ''}</div>
            
            ${stepsHTML ? `
            <div class="result-section">
                <div class="result-section-title" style="color: ${levelColor}"><i class="fas fa-first-aid"></i> Immediate Steps</div>
                <div class="emergency-steps">${stepsHTML}</div>
            </div>` : ''}
            
            ${warningsHTML ? `
            <div class="result-section">
                <div class="result-section-title" style="color: #ef4444"><i class="fas fa-ban"></i> Do NOT Do</div>
                <div class="warning-list">${warningsHTML}</div>
            </div>` : ''}
            
            <div class="disclaimer-box" style="border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.1); color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${data.disclaimer || 'This is AI guidance only. Always call emergency services for real emergencies.'}</span>
            </div>
        </div>
    `;
}

// ============================================
// History
// ============================================
function saveToHistory(type, input, result) {
    const entry = {
        id: Date.now(),
        type,
        input: input.substring(0, 100),
        timestamp: new Date().toISOString(),
        result
    };
    
    state.analysisHistory.unshift(entry);
    if (state.analysisHistory.length > 20) state.analysisHistory.pop();
    
    localStorage.setItem('medisense_history', JSON.stringify(state.analysisHistory));
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('historyTimeline');
    if (!container) return;
    
    if (!state.analysisHistory.length) {
        container.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-clock"></i>
                <p>Your analysis history will appear here</p>
            </div>
        `;
        return;
    }
    
    const typeIcons = { symptom: 'fa-stethoscope', report: 'fa-file-medical', drug: 'fa-pills', skin: 'fa-search' };
    const typeLabels = { symptom: 'Symptom Analysis', report: 'Report Explained', drug: 'Drug Check', skin: 'Skin Analysis' };
    const typeColors = { symptom: 'var(--primary-light)', report: 'var(--accent-light)', drug: 'var(--warning)', skin: '#a855f7' };
    
    container.innerHTML = state.analysisHistory.slice(0, 5).map(entry => {
        const date = new Date(entry.timestamp);
        const timeAgo = getTimeAgo(date);
        return `
            <div class="history-item">
                <div class="history-icon" style="color: ${typeColors[entry.type]}; background: ${typeColors[entry.type]}15;">
                    <i class="fas ${typeIcons[entry.type] || 'fa-circle'}"></i>
                </div>
                <div class="history-info">
                    <div class="history-label">${typeLabels[entry.type] || 'Analysis'}</div>
                    <div class="history-input">${entry.input}${entry.input.length >= 100 ? '...' : ''}</div>
                    <div class="history-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
}

// ============================================
// Export / Print
// ============================================
function exportResults(type) {
    const sections = {
        symptom: document.getElementById('symptomResults'),
        report: document.getElementById('reportResults'),
        drug: document.getElementById('drugResults'),
        skin: document.getElementById('skinResults')
    };
    
    const content = sections[type];
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>MediSense AI — ${type.charAt(0).toUpperCase() + type.slice(1)} Report</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #6366f1; }
                .header h1 { color: #6366f1; margin: 0; }
                .header p { color: #666; margin: 5px 0 0; }
                .content { line-height: 1.8; }
                .disclaimer { margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 8px; font-size: 13px; color: #856404; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏥 MediSense AI</h1>
                <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            <div class="content">${content.innerHTML}</div>
            <div class="footer">MediSense AI — AI-Powered Health Companion | This is not a substitute for professional medical advice.</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ============================================
// Disclaimer
// ============================================
function closeDisclaimer() {
    const banner = document.getElementById('disclaimerBanner');
    if (banner) banner.classList.add('hidden');
}

// ============================================
// Skin Disease Analyzer
// ============================================
function initSkinUpload() {
    const dropzone = document.getElementById('skinDropzone');
    const fileInput = document.getElementById('skinImageInput');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleSkinImage(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleSkinImage(e.target.files[0]); });
}

function handleSkinImage(file) {
    if (!file.type.startsWith('image/')) { showToast('Please upload an image file.', 'warning'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('Image too large. Max 10MB.', 'warning'); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
        state.skinImageBase64 = e.target.result;
        const preview = document.getElementById('skinPreview');
        const dropzone = document.getElementById('skinDropzone');
        if (preview) {
            preview.innerHTML = `<div class="image-preview-card"><img src="${e.target.result}" alt="Skin condition"><div class="image-preview-info"><span><i class="fas fa-camera"></i> ${file.name}</span><button class="btn-remove-image" onclick="removeSkinImage()"><i class="fas fa-times"></i> Remove</button></div></div>`;
            preview.style.display = 'block';
        }
        if (dropzone) dropzone.style.display = 'none';
        showToast('Image uploaded!', 'success');
    };
    reader.readAsDataURL(file);
}

function removeSkinImage() {
    state.skinImageBase64 = null;
    const preview = document.getElementById('skinPreview');
    const dropzone = document.getElementById('skinDropzone');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
    if (dropzone) dropzone.style.display = 'flex';
    const fi = document.getElementById('skinImageInput');
    if (fi) fi.value = '';
}

async function analyzeSkin() {
    if (!state.skinImageBase64) { showToast('Please upload a photo of the skin condition.', 'warning'); return; }

    const description = document.getElementById('skinDescription')?.value.trim() || '';
    showLoading('Analyzing skin condition...');

    try {
        const res = await fetch('/api/analyze-skin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: state.skinImageBase64, description })
        });
        if (!res.ok) throw new Error('Analysis failed');
        const data = await res.json();
        renderSkinResults(data);
        saveToHistory('skin', description || 'Skin Image Analysis', data);
    } catch (error) {
        showToast('Skin analysis failed. Please try again.', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

function renderSkinResults(data) {
    const panel = document.getElementById('skinResults');
    if (!panel) return;

    const sevClass = `severity-${(data.severity || 'mild').toLowerCase()}`;
    const sevIcons = { Mild: 'fa-check-circle', Moderate: 'fa-exclamation', Severe: 'fa-exclamation-triangle' };

    let conditionsHTML = '';
    if (data.possibleConditions) {
        conditionsHTML = data.possibleConditions.map(c => `
            <div class="condition-card">
                <div class="condition-header">
                    <span class="condition-name">${c.name}</span>
                    <span class="likelihood-badge likelihood-${(c.likelihood || 'medium').toLowerCase()}">${c.likelihood}</span>
                </div>
                <div class="condition-desc">${c.description}</div>
            </div>
        `).join('');
    }

    let careHTML = '';
    if (data.careRecommendations) {
        careHTML = data.careRecommendations.map(r => `<li>${r}</li>`).join('');
    }

    panel.innerHTML = `
        <div class="result-content">
            <div class="result-header-row">
                <span class="severity-badge ${sevClass}">
                    <i class="fas ${sevIcons[data.severity] || 'fa-info-circle'}"></i> ${data.severity || 'Unknown'} Severity
                </span>
                <button class="btn btn-glass btn-sm" onclick="exportResults('skin')">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>

            ${data.observation ? `<div class="result-summary"><strong>Observation:</strong> ${data.observation}</div>` : ''}

            ${conditionsHTML ? `
            <div class="result-section">
                <div class="result-section-title"><i class="fas fa-search"></i> Possible Conditions</div>
                ${conditionsHTML}
            </div>` : ''}

            ${data.urgency ? `
            <div class="result-section">
                <div class="result-section-title"><i class="fas fa-clock"></i> When to See a Doctor</div>
                <div class="condition-card" style="border-color: ${data.seeDoctor ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}">
                    <span style="color: ${data.seeDoctor ? '#ef4444' : '#22c55e'}; font-weight: 600;">
                        <i class="fas ${data.seeDoctor ? 'fa-user-md' : 'fa-check'}"></i> ${data.urgency}
                    </span>
                </div>
            </div>` : ''}

            ${careHTML ? `
            <div class="result-section">
                <div class="result-section-title"><i class="fas fa-hand-holding-medical"></i> Care Recommendations</div>
                <ul class="recommendation-list">${careHTML}</ul>
            </div>` : ''}

            <div class="disclaimer-box">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${data.disclaimer || 'This is AI-based visual analysis only. Please consult a dermatologist.'}</span>
            </div>
        </div>
    `;
}

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initImageUpload();
    initSkinUpload();
    animateStats();
    renderHistory();
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (nav) {
            nav.classList.toggle('scrolled', window.scrollY > 20);
        }
    });
});
