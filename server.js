// ============================================
// MediSense AI — Server Entry Point
// ============================================

// Load env vars FIRST — this import executes before everything else in ESM
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Route imports
import authRoutes from './backend/routes/auth.js';
import symptomRoutes from './backend/routes/symptoms.js';
import reportRoutes from './backend/routes/reports.js';
import drugRoutes from './backend/routes/drugs.js';
import chatRoutes from './backend/routes/chat.js';
import emergencyRoutes from './backend/routes/emergency.js';
import skinRoutes from './backend/routes/skin.js';
import timelineRoutes from './backend/routes/timeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ── Middleware ──────────────────────────────
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ─────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/analyze-symptoms', symptomRoutes);
app.use('/api/explain-report', reportRoutes);
app.use('/api/check-interactions', drugRoutes);
app.use('/api/health-chat', chatRoutes);
app.use('/api/emergency-assess', emergencyRoutes);
app.use('/api/analyze-skin', skinRoutes);
app.use('/api/timeline', timelineRoutes);

// ── SPA Catch-all ──────────────────────────
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ───────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🏥 MediSense AI running on http://localhost:${PORT}`);
    console.log(`📁 Backend: modular routes loaded`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
