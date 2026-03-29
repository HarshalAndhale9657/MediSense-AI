// ============================================
// MediSense AI — Emergency SOS Route
// ============================================

import { Router } from 'express';
import { openai } from '../config/openai.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';

const router = Router();

// No rate limit on emergency — should always be accessible
router.post('/', async (req, res) => {
    try {
        const { situation } = req.body;
        if (!situation || typeof situation !== 'string' || situation.length < 3) {
            return res.status(400).json({ error: 'Please describe the emergency situation.' });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPTS.emergency },
                { role: 'user', content: `Emergency situation: ${situation}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2
        });

        res.json(JSON.parse(completion.choices[0].message.content));
    } catch (error) {
        console.error('Emergency assessment error:', error);
        res.status(500).json({ error: 'Emergency assessment failed. CALL EMERGENCY SERVICES if this is urgent.' });
    }
});

export default router;
