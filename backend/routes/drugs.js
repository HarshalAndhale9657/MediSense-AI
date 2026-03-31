// ============================================
// MediSense AI — Drug Interaction Route
// ============================================

import { Router } from 'express';
import { openai } from '../config/openai.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import { optionalAuth } from '../middleware/auth.js';
import { healthTwinService } from '../services/healthTwin.js';

const router = Router();

router.post('/', rateLimit(), optionalAuth, async (req, res) => {
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

        const aiResponse = JSON.parse(completion.choices[0].message.content);
        healthTwinService.insertEvent(req, 'drug', { medications }, aiResponse);
        res.json(aiResponse);
    } catch (error) {
        console.error('Drug interaction error:', error);
        res.status(500).json({ error: 'Interaction check failed. Please try again.' });
    }
});

export default router;
