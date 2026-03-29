// ============================================
// MediSense AI — Health Chat Route
// ============================================

import { Router } from 'express';
import { openai } from '../config/openai.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';
import { rateLimit } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/', rateLimit(), async (req, res) => {
    try {
        const { messages } = req.body;
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Please provide a message.' });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPTS.healthChat },
                ...messages.slice(-10)
            ],
            temperature: 0.7
        });

        res.json({ reply: completion.choices[0].message.content });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Chat failed. Please try again.' });
    }
});

export default router;
