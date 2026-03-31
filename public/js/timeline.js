// ============================================
// MediSense AI — Health Twin Timeline (Premium)
// ============================================

import { auth } from './auth.js';

// Store insights globally for trend comparison in app.js
window.healthInsights = null;

export async function fetchHealthTwinTimeline() {
    if (!auth.isLoggedIn()) return;
    
    try {
        const [timelineRes, insightsRes] = await Promise.all([
            fetch('/api/timeline', { headers: auth.getHeaders() }),
            fetch('/api/timeline/insights', { headers: auth.getHeaders() }).catch(() => null)
        ]);
        
        if (!timelineRes.ok) throw new Error('Failed to fetch timeline');
        const events = await timelineRes.json();
        
        renderDashboardStats(events);
        renderHealthTwinTimeline(events);

        // Render insights if available
        if (insightsRes && insightsRes.ok) {
            const insights = await insightsRes.json();
            window.healthInsights = insights;
            renderBaselines(insights.baselines, insights.trends);
            renderMonthlySnapshot(insights.monthlySnapshot);
        }
    } catch (error) {
        console.error('Error fetching timeline:', error);
    }
}

// ---- Dashboard Stats ----
function renderDashboardStats(events) {
    const totalEl = document.getElementById('twinTotalAnalyses');
    if (totalEl) totalEl.textContent = events.length;

    const streakEl = document.getElementById('twinStreak');
    if (streakEl && events.length) {
        streakEl.textContent = getTimeAgo(new Date(events[0].created_at));
    } else if (streakEl) {
        streakEl.textContent = '—';
    }

    const typesEl = document.getElementById('twinTypes');
    if (typesEl) {
        const uniqueTypes = new Set(events.map(e => e.type));
        typesEl.textContent = uniqueTypes.size;
    }

    const cloudEl = document.getElementById('twinCloud');
    if (cloudEl) cloudEl.textContent = events.length > 0 ? 'Synced' : 'Ready';

    const countEl = document.getElementById('twinTimelineCount');
    if (countEl) {
        countEl.textContent = events.length ? `${events.length} event${events.length > 1 ? 's' : ''}` : '';
    }
}

// ---- Health Baselines ----
function renderBaselines(baselines, trends) {
    const section = document.getElementById('twinBaselinesSection');
    const grid = document.getElementById('baselinesGrid');
    const badge = document.getElementById('baselineCount');
    if (!section || !grid) return;

    if (!baselines || !baselines.length) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';
    if (badge) badge.textContent = `${baselines.length} metric${baselines.length > 1 ? 's' : ''}`;

    // Build a quick trend lookup
    const trendMap = {};
    if (trends) {
        for (const t of trends) trendMap[t.name] = t;
    }

    grid.innerHTML = baselines.map(b => {
        const statusClass = `status-${(b.status || 'normal').toLowerCase()}`;
        const trend = trendMap[b.name];
        let trendHTML = '';

        if (trend) {
            const arrows = { up: '↑', down: '↓', stable: '→' };
            const trendClass = `trend-${trend.direction}`;
            trendHTML = `<span class="baseline-trend ${trendClass}">${arrows[trend.direction]} ${trend.change || ''}</span>`;
        }

        return `
            <div class="baseline-chip">
                <div class="baseline-status-dot ${statusClass}"></div>
                <div class="baseline-info">
                    <div class="baseline-name">${b.name}</div>
                    <div class="baseline-value-row">
                        <span class="baseline-value">${b.value}</span>
                        ${trendHTML}
                    </div>
                    ${b.normalRange ? `<div class="baseline-range">Normal: ${b.normalRange}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ---- Monthly Snapshot ----
function renderMonthlySnapshot(snapshot) {
    const section = document.getElementById('twinSnapshotSection');
    if (!section) return;

    if (!snapshot) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    // Period badge
    const periodEl = document.getElementById('snapshotPeriod');
    if (periodEl) periodEl.textContent = snapshot.period;

    // Stat: total analyses
    const analysesEl = document.getElementById('snapshotAnalyses');
    if (analysesEl) {
        analysesEl.querySelector('.snapshot-stat-value').textContent = snapshot.totalAnalyses;
    }

    // Stat: types used
    const typesEl = document.getElementById('snapshotTypes');
    if (typesEl) {
        typesEl.querySelector('.snapshot-stat-value').textContent = snapshot.typesUsed.length;
    }

    // Severity breakdown bars
    const sevEl = document.getElementById('snapshotSeverity');
    if (sevEl) {
        const sevColors = { Low: '#22c55e', Mild: '#22c55e', Moderate: '#f59e0b', High: '#ef4444', Severe: '#ef4444', Critical: '#dc2626', Emergency: '#dc2626' };
        const total = Object.values(snapshot.severityBreakdown).reduce((a, b) => a + b, 0);
        const entries = Object.entries(snapshot.severityBreakdown);

        if (entries.length) {
            sevEl.innerHTML = `
                <div class="snapshot-severity-title">Severity Breakdown</div>
                <div class="severity-bars">
                    ${entries.map(([label, count]) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const color = sevColors[label] || '#94a3b8';
                        return `
                            <div class="severity-bar-row">
                                <span class="severity-bar-label" style="color:${color}">${label}</span>
                                <div class="severity-bar-track">
                                    <div class="severity-bar-fill" style="width:${pct}%;background:${color}"></div>
                                </div>
                                <span class="severity-bar-count">${count}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            sevEl.innerHTML = '<div class="snapshot-empty">No severity data yet</div>';
        }
    }

    // Top concerns tags
    const concernsEl = document.getElementById('snapshotConcerns');
    if (concernsEl) {
        if (snapshot.topConcerns?.length) {
            concernsEl.innerHTML = `
                <div class="snapshot-concerns-title">Top Health Concerns</div>
                <div class="concern-tags">
                    ${snapshot.topConcerns.map(c => `<span class="concern-tag"><i class="fas fa-exclamation-circle"></i> ${c}</span>`).join('')}
                </div>
            `;
        } else {
            concernsEl.innerHTML = '<div class="snapshot-empty">No health concerns flagged</div>';
        }
    }
}

// ---- Timeline Rendering ----
function renderHealthTwinTimeline(events) {
    const container = document.getElementById('historyTimeline');
    if (!container) return;
    
    if (!events.length) {
        container.innerHTML = `
            <div class="empty-history">
                <div class="empty-twin-icon">
                    <i class="fas fa-dna"></i>
                </div>
                <h4>Your Health Twin is Ready</h4>
                <p>Start using any analyzer to build your personal health history. Every check, report, and interaction is securely stored in your timeline.</p>
            </div>
        `;
        return;
    }
    
    const typeIcons = { symptom: 'fa-stethoscope', report: 'fa-file-medical', drug: 'fa-pills', skin: 'fa-search', emergency: 'fa-first-aid' };
    const typeLabels = { symptom: 'Symptom Analysis', report: 'Report Explained', drug: 'Drug Interaction Check', skin: 'Skin Condition Analysis', emergency: 'Emergency SOS' };
    const typeColors = { symptom: '#818cf8', report: '#22d3ee', drug: '#f59e0b', skin: '#a855f7', emergency: '#ef4444' };
    
    container.innerHTML = events.slice(0, 15).map((entry, index) => {
        const date = new Date(entry.created_at);
        const timeAgo = getTimeAgo(date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const color = typeColors[entry.type] || '#818cf8';
        
        const inputSummary = getInputSummary(entry);
        const aiInsight = getAIInsight(entry);
        const statusBadge = getStatusBadge(entry);
        
        return `
            <div class="twin-event-card" style="--event-color: ${color}; animation-delay: ${index * 0.05}s">
                <div class="twin-event-line"></div>
                <div class="twin-event-dot">
                    <i class="fas ${typeIcons[entry.type] || 'fa-circle'}"></i>
                </div>
                <div class="twin-event-content">
                    <div class="twin-event-top">
                        <span class="twin-event-type">${typeLabels[entry.type] || 'Analysis'}</span>
                        ${statusBadge}
                    </div>
                    <div class="twin-event-input">${inputSummary}</div>
                    ${aiInsight ? `<div class="twin-event-insight"><i class="fas fa-robot"></i> ${aiInsight}</div>` : ''}
                    <div class="twin-event-meta">
                        <span class="twin-event-date"><i class="far fa-clock"></i> ${timeAgo}</span>
                        <span class="twin-event-fulldate">${dateStr} at ${timeStr}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ---- Helpers ----
function getInputSummary(entry) {
    if (entry.type === 'symptom' && entry.input_data?.symptoms) return entry.input_data.symptoms;
    if (entry.type === 'report' && entry.input_data?.reportText) return entry.input_data.reportText;
    if (entry.type === 'report' && entry.input_data?.type === 'image') return 'Medical report image upload' + (entry.input_data.additionalText ? ` — ${entry.input_data.additionalText}` : '');
    if (entry.type === 'drug' && entry.input_data?.medications) return entry.input_data.medications.join(' + ');
    if (entry.type === 'skin') {
        if (entry.input_data?.description) return entry.input_data.description;
        if (entry.ai_response?.observation) return entry.ai_response.observation;
        return 'Skin condition image analyzed';
    }
    if (entry.type === 'emergency' && entry.input_data?.situation) return entry.input_data.situation;
    return 'Health analysis performed';
}

function getAIInsight(entry) {
    const ai = entry.ai_response;
    if (!ai) return '';
    
    if (entry.type === 'symptom') {
        if (ai.possibleConditions?.length) {
            const top = ai.possibleConditions.slice(0, 2).map(c => c.name || c).join(', ');
            return `Possible: ${top}`;
        }
        if (ai.summary) return truncate(ai.summary, 100);
    }
    
    if (entry.type === 'report') {
        if (ai.summary) return truncate(ai.summary, 100);
        if (ai.reportType) return `Report type: ${ai.reportType}`;
    }
    
    if (entry.type === 'drug') {
        if (ai.safeToTakeTogether === true) return '✅ Generally safe to take together';
        if (ai.safeToTakeTogether === false) {
            const count = ai.interactions?.length || 0;
            return `⚠️ ${count} interaction${count !== 1 ? 's' : ''} found — review needed`;
        }
        if (ai.generalAdvice) return truncate(ai.generalAdvice, 100);
    }
    
    if (entry.type === 'skin') {
        if (ai.possibleConditions?.length) {
            const top = ai.possibleConditions[0];
            return `${top.name || top}${top.likelihood ? ` (${top.likelihood} likelihood)` : ''}`;
        }
        if (ai.observation) return truncate(ai.observation, 100);
    }
    
    if (entry.type === 'emergency') {
        if (ai.assessment) return truncate(ai.assessment, 100);
    }
    
    return '';
}

function getStatusBadge(entry) {
    const ai = entry.ai_response;
    if (!ai) return '';
    
    if (ai.severity) {
        const sevColors = { Low: '#22c55e', Mild: '#22c55e', Moderate: '#f59e0b', High: '#ef4444', Severe: '#ef4444' };
        const color = sevColors[ai.severity] || '#94a3b8';
        return `<span class="twin-event-badge" style="--badge-color: ${color}">${ai.severity}</span>`;
    }
    
    if (entry.type === 'drug') {
        if (ai.safeToTakeTogether === true) return `<span class="twin-event-badge" style="--badge-color: #22c55e">Safe</span>`;
        if (ai.safeToTakeTogether === false) return `<span class="twin-event-badge" style="--badge-color: #ef4444">Caution</span>`;
    }
    
    if (ai.urgencyLevel) {
        const urgColors = { Critical: '#dc2626', High: '#ef4444', Moderate: '#f59e0b', Low: '#22c55e' };
        const color = urgColors[ai.urgencyLevel] || '#f59e0b';
        return `<span class="twin-event-badge" style="--badge-color: ${color}">${ai.urgencyLevel}</span>`;
    }
    
    return '';
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '…' : str;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 172800) return 'Yesterday';
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

// Attach to window
window.fetchHealthTwinTimeline = fetchHealthTwinTimeline;

// Fetch immediately if already logged in
if (auth.isLoggedIn()) {
    fetchHealthTwinTimeline();
}
