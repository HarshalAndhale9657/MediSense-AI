// ============================================
// MediSense AI — Report Explainer Routes
// ============================================

import { Router } from 'express';
import { openai } from '../config/openai.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import { optionalAuth } from '../middleware/auth.js';
import { healthTwinService } from '../services/healthTwin.js';

const router = Router();

// Text-based report explanation
router.post('/', rateLimit(), optionalAuth, async (req, res) => {
    try {
        const { reportText } = req.body;
        if (!reportText || typeof reportText !== 'string' || reportText.length < 5) {
            return res.status(400).json({ error: 'Please provide valid report text.' });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPTS.reportExplainer },
                { role: 'user', content: `Explain this medical report:\n${reportText}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3
        });

        const aiResponse = JSON.parse(completion.choices[0].message.content);
        healthTwinService.insertEvent(req, 'report', { reportText }, aiResponse);
        res.json(aiResponse);
    } catch (error) {
        console.error('Report explanation error:', error);
        res.status(500).json({ error: 'Report analysis failed. Please try again.' });
    }
});

// Image-based report analysis
router.post('/image', rateLimit(), optionalAuth, async (req, res) => {
    try {
        const { imageBase64, additionalText } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: 'Please provide an image.' });
        }

        const userContent = [
            {
                type: 'image_url',
                image_url: { url: imageBase64, detail: 'high' }
            }
        ];

        if (additionalText) {
            userContent.push({
                type: 'text',
                text: `Additional context from the user: ${additionalText}`
            });
        } else {
            userContent.push({
                type: 'text',
                text: 'Please analyze this medical report/document image and explain it in plain English.'
            });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPTS.reportImageExplainer },
                { role: 'user', content: userContent }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 4096
        });

        const aiResponse = JSON.parse(completion.choices[0].message.content);
        // Only save that it was an image report, don't save the whole base64 string to avoid DB bloat for MVP
        healthTwinService.insertEvent(req, 'report', { type: 'image', additionalText }, aiResponse);
        res.json(aiResponse);
    } catch (error) {
        console.error('Image report analysis error:', error);
        res.status(500).json({ error: 'Image analysis failed. Please try again.' });
    }
});

export default router;
