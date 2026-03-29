// ============================================
// MediSense AI — Drug Interaction Route
// ============================================

import { Router } from 'express';
import { openai } from '../config/openai.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';
import { rateLimit } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/', rateLimit(), async (req, res) => {
    try {
        const { medications } = req.body;
        if (!Array.isArray(medications) || medications.length < 2) {
            return res.status(400).json({ error: 'Please provide at least 2 medications.' });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPTS.drugInteraction },
                { role: 'user', content: `Check interactions for these medications: ${medications.join(', ')}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3
        });

        res.json(JSON.parse(completion.choices[0].message.content));
    } catch (error) {
        console.error('Drug interaction error:', error);
        res.status(500).json({ error: 'Interaction check failed. Please try again.' });
    }
});

export default router;
