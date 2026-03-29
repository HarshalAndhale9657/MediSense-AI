// ============================================
// MediSense AI — Skin Disease Analyzer Route
// ============================================

import { Router } from 'express';
import { openai } from '../config/openai.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';
import { rateLimit } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/', rateLimit(), async (req, res) => {
    try {
        const { imageBase64, description } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: 'Please provide an image of the skin condition.' });
        }

        const userContent = [
            {
                type: 'image_url',
                image_url: { url: imageBase64, detail: 'high' }
            },
            {
                type: 'text',
                text: description
                    ? `Please analyze this skin condition. Additional context from the user: ${description}`
                    : 'Please analyze this skin condition image and identify possible conditions.'
            }
        ];

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPTS.skinAnalyzer },
                { role: 'user', content: userContent }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 4096
        });

        res.json(JSON.parse(completion.choices[0].message.content));
    } catch (error) {
        console.error('Skin analysis error:', error);
        res.status(500).json({ error: 'Skin analysis failed. Please try again.' });
    }
});

export default router;
