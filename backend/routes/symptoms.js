// ============================================
// MediSense AI — Symptom Analyzer Route
// ============================================

import { Router } from 'express';
import { openai } from '../config/openai.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';
import { rateLimit } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/', rateLimit(), async (req, res) => {
    try {
        const { symptoms } = req.body;
        if (!symptoms || typeof symptoms !== 'string' || symptoms.length < 3) {
            return res.status(400).json({ error: 'Please provide a valid symptom description.' });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPTS.symptomAnalyzer },
                { role: 'user', content: `Analyze these symptoms: ${symptoms}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3
        });

        res.json(JSON.parse(completion.choices[0].message.content));
    } catch (error) {
        console.error('Symptom analysis error:', error);
        res.status(500).json({ error: 'Analysis failed. Please try again.' });
    }
});

export default router;
