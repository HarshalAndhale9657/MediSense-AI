// ============================================
// MediSense AI — Rate Limiter Middleware
// ============================================

const rateLimiterStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const ip in rateLimiterStore) {
        rateLimiterStore[ip] = rateLimiterStore[ip].filter(t => now - t < 60000);
        if (rateLimiterStore[ip].length === 0) delete rateLimiterStore[ip];
    }
}, 300000);

export function rateLimit(max = 20, windowMs = 60000) {
    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();

        if (!rateLimiterStore[ip]) rateLimiterStore[ip] = [];
        rateLimiterStore[ip] = rateLimiterStore[ip].filter(t => now - t < windowMs);

        if (rateLimiterStore[ip].length >= max) {
            return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
        }

        rateLimiterStore[ip].push(now);
        next();
    };
}
