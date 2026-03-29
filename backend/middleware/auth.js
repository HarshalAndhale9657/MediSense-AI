// ============================================
// MediSense AI — Auth Middleware
// ============================================

import { supabase } from '../config/supabase.js';

// Verify JWT from Supabase and attach user to request
export async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required. Please log in.' });
        }

        const token = authHeader.split(' ')[1];

        if (!supabase) {
            return res.status(503).json({ error: 'Auth service unavailable.' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed.' });
    }
}

// Optional auth — attaches user if present, but doesn't block
export async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ') || !supabase) {
            req.user = null;
            return next();
        }

        const token = authHeader.split(' ')[1];
        const { data: { user } } = await supabase.auth.getUser(token);
        req.user = user || null;
        req.token = token;
        next();
    } catch {
        req.user = null;
        next();
    }
}
