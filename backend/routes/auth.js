// ============================================
// MediSense AI — Auth Routes
// ============================================

import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ── Sign Up ────────────────────────────────
router.post('/signup', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Auth service unavailable. Please configure Supabase.' });
        }

        const { email, password, fullName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName || '',
                }
            }
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            message: 'Account created successfully!',
            user: {
                id: data.user?.id,
                email: data.user?.email,
                fullName: data.user?.user_metadata?.full_name
            },
            session: data.session
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Signup failed. Please try again.' });
    }
});

// ── Log In ─────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Auth service unavailable.' });
        }

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({ error: error.message });
        }

        res.json({
            message: 'Logged in successfully!',
            user: {
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.user_metadata?.full_name
            },
            session: data.session
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// ── Log Out ────────────────────────────────
router.post('/logout', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Auth service unavailable.' });
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Logged out successfully.' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed.' });
    }
});

// ── Get Current User ───────────────────────
router.get('/me', requireAuth, async (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            fullName: req.user.user_metadata?.full_name,
            createdAt: req.user.created_at
        }
    });
});

// ── Google OAuth URL ───────────────────────
router.post('/google', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Auth service unavailable.' });
        }

        const { redirectUrl } = req.body;

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl || `${req.protocol}://${req.get('host')}/auth/callback`
            }
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ url: data.url });
    } catch (error) {
        console.error('Google OAuth error:', error);
        res.status(500).json({ error: 'Google sign-in failed.' });
    }
});

export default router;
