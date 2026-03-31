// ============================================
// MediSense AI — Timeline Route
// ============================================

import { Router } from 'express';
import { getAuthenticatedClient } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/timeline
router.get('/', requireAuth, async (req, res) => {
    try {
        const supabaseAuth = getAuthenticatedClient(req.token);
        if (!supabaseAuth) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        // Get the user's Self profile
        const { data: profile, error: profileError } = await supabaseAuth
            .from('profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('relation', 'Self')
            .single();

        if (profileError || !profile) {
            // New user might not have profile trigger fired yet or it's missing
            return res.json([]); 
        }

        // Get past health events, ordered by newest first
        const { data: events, error: eventsError } = await supabaseAuth
            .from('health_events')
            .select('*')
            .eq('profile_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(50); // Give last 50 events

        if (eventsError) {
            throw eventsError;
        }

        res.json(events);
    } catch (error) {
        console.error('Timeline error:', error);
        res.status(500).json({ error: 'Failed to fetch your Health Twin timeline.' });
    }
});

// GET /api/timeline/insights — Baselines, Trends, Monthly Snapshot
router.get('/insights', requireAuth, async (req, res) => {
    try {
        const supabaseAuth = getAuthenticatedClient(req.token);
        if (!supabaseAuth) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const { data: profile } = await supabaseAuth
            .from('profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('relation', 'Self')
            .single();

        if (!profile) {
            return res.json({ baselines: [], trends: [], monthlySnapshot: null });
        }

        // Fetch ALL events for this user (for baselines we need full history)
        const { data: events, error } = await supabaseAuth
            .from('health_events')
            .select('type, input_data, ai_response, created_at')
            .eq('profile_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        // ---- 1. Compute Baselines & Trends from report metrics ----
        const metricHistory = {};  // { "Hemoglobin": [{value, status, normalRange, date}, ...] }

        events
            .filter(e => e.type === 'report' && e.ai_response?.metrics?.length)
            .forEach(e => {
                const date = e.created_at;
                for (const m of e.ai_response.metrics) {
                    if (!m.name || !m.value) continue;
                    if (!metricHistory[m.name]) metricHistory[m.name] = [];
                    metricHistory[m.name].push({
                        value: m.value,
                        status: m.status || 'Normal',
                        normalRange: m.normalRange || '',
                        date
                    });
                }
            });

        const baselines = [];
        const trends = [];

        for (const [name, entries] of Object.entries(metricHistory)) {
            // entries are already sorted newest-first (from the query)
            const latest = entries[0];
            baselines.push({
                name,
                value: latest.value,
                status: latest.status,
                normalRange: latest.normalRange,
                lastUpdated: latest.date
            });

            // Trend: compare latest vs previous
            if (entries.length >= 2) {
                const previous = entries[1];
                const currentNum = parseFloat(latest.value);
                const previousNum = parseFloat(previous.value);
                let direction = 'stable';
                let change = '';
                
                if (!isNaN(currentNum) && !isNaN(previousNum)) {
                    if (currentNum > previousNum) {
                        direction = 'up';
                        change = `+${(currentNum - previousNum).toFixed(1)}`;
                    } else if (currentNum < previousNum) {
                        direction = 'down';
                        change = `${(currentNum - previousNum).toFixed(1)}`;
                    }
                }

                trends.push({
                    name,
                    current: latest.value,
                    previous: previous.value,
                    direction,
                    change,
                    currentStatus: latest.status,
                    previousDate: previous.date
                });
            }
        }

        // ---- 2. Monthly Snapshot ----
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEvents = events.filter(e => e.created_at >= monthStart);

        const severityBreakdown = {};
        const topConcernsSet = new Set();

        for (const e of monthEvents) {
            const ai = e.ai_response;
            // Count severities
            const sev = ai?.severity || ai?.urgencyLevel;
            if (sev) severityBreakdown[sev] = (severityBreakdown[sev] || 0) + 1;

            // Collect top concerns (condition names)
            if (ai?.possibleConditions) {
                for (const c of ai.possibleConditions.slice(0, 2)) {
                    if (c.name) topConcernsSet.add(c.name);
                }
            }
        }

        const monthlySnapshot = monthEvents.length > 0 ? {
            totalAnalyses: monthEvents.length,
            typesUsed: [...new Set(monthEvents.map(e => e.type))],
            severityBreakdown,
            topConcerns: [...topConcernsSet].slice(0, 5),
            period: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            activeSince: events.length > 0
                ? new Date(events[events.length - 1].created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : null
        } : null;

        res.json({ baselines, trends, monthlySnapshot });
    } catch (error) {
        console.error('Insights error:', error);
        res.status(500).json({ error: 'Failed to compute health insights.' });
    }
});

export default router;
