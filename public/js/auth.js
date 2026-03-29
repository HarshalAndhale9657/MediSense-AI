// ============================================
// MediSense AI — Auth Module
// ============================================

const AUTH_KEY = 'medisense_auth';

export const auth = {
    // Current auth state
    user: null,
    session: null,

    // Initialize from localStorage
    init() {
        const saved = localStorage.getItem(AUTH_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.user = data.user;
                this.session = data.session;
            } catch {
                localStorage.removeItem(AUTH_KEY);
            }
        }
        this.updateUI();
        return this;
    },

    // Check if logged in
    isLoggedIn() {
        return !!this.session?.access_token;
    },

    // Get auth headers for API calls
    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.session?.access_token) {
            headers['Authorization'] = `Bearer ${this.session.access_token}`;
        }
        return headers;
    },

    // Save auth state
    save(user, session) {
        this.user = user;
        this.session = session;
        localStorage.setItem(AUTH_KEY, JSON.stringify({ user, session }));
        this.updateUI();
    },

    // Clear auth state (logout)
    clear() {
        this.user = null;
        this.session = null;
        localStorage.removeItem(AUTH_KEY);
        this.updateUI();
    },

    // Sign up
    async signup(email, password, fullName) {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');

        if (data.session) {
            this.save(data.user, data.session);
        }
        return data;
    },

    // Log in
    async login(email, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        this.save(data.user, data.session);
        return data;
    },

    // Log out
    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: this.getHeaders()
            });
        } catch {
            // Ignore network errors on logout
        }
        this.clear();
    },

    // Google OAuth
    async loginWithGoogle() {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ redirectUrl: window.location.origin + '/auth/callback' })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Google sign-in failed');

        if (data.url) {
            window.location.href = data.url;
        }
    },

    // Update all UI elements based on auth state
    updateUI() {
        const loggedIn = this.isLoggedIn();

        // Toggle auth-dependent elements
        document.querySelectorAll('[data-auth="logged-in"]').forEach(el => {
            el.style.display = loggedIn ? '' : 'none';
        });
        document.querySelectorAll('[data-auth="logged-out"]').forEach(el => {
            el.style.display = loggedIn ? 'none' : '';
        });

        // Update user info displays
        document.querySelectorAll('[data-auth-name]').forEach(el => {
            el.textContent = this.user?.fullName || this.user?.email?.split('@')[0] || 'User';
        });
        document.querySelectorAll('[data-auth-email]').forEach(el => {
            el.textContent = this.user?.email || '';
        });

        // Update avatar
        document.querySelectorAll('[data-auth-avatar]').forEach(el => {
            const name = this.user?.fullName || this.user?.email || 'U';
            el.textContent = name.charAt(0).toUpperCase();
        });
    }
};
