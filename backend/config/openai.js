// ============================================
// MediSense AI — OpenAI Client
// ============================================
// NOTE: dotenv must be configured before this module loads.
// In ESM, use: import 'dotenv/config' in server.js before importing routes.

import { OpenAI } from 'openai';

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
