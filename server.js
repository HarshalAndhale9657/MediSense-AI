import express from 'express';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple rate limiter
const rateLimiter = {};
function rateLimit(ip, max = 20, windowMs = 60000) {
    const now = Date.now();
    if (!rateLimiter[ip]) rateLimiter[ip] = [];
    rateLimiter[ip] = rateLimiter[ip].filter(t => now - t < windowMs);
    if (rateLimiter[ip].length >= max) return false;
    rateLimiter[ip].push(now);
    return true;
}

// System prompts for different features
const SYSTEM_PROMPTS = {
    symptomAnalyzer: `You are MediSense AI, an advanced medical symptom analysis assistant. You are NOT a doctor and must always remind users to consult healthcare professionals.

When a user describes symptoms:
1. Analyze the symptoms carefully
2. Provide a severity assessment (Low / Moderate / High / Emergency)
3. List possible conditions (most likely first) with brief explanations
4. Recommend specific actions (home care, see doctor, go to ER)
5. Ask relevant follow-up questions

Format your response as JSON:
{
  "severity": "Low|Moderate|High|Emergency",
  "severityColor": "#22c55e|#f59e0b|#ef4444|#dc2626",
  "possibleConditions": [
    { "name": "Condition", "likelihood": "High|Medium|Low", "description": "Brief explanation" }
  ],
  "recommendations": ["action1", "action2"],
  "followUpQuestions": ["question1", "question2"],
  "summary": "Brief 2-3 line summary of analysis",
  "disclaimer": "This is not a medical diagnosis. Please consult a healthcare professional."
}`,

    reportExplainer: `You are MediSense AI, a medical report interpreter. Your job is to explain medical reports in simple, easy-to-understand language.

When given medical report text:
1. Identify the type of report
2. Break down each metric/value
3. Highlight abnormal values
4. Explain what they mean in plain English
5. Suggest follow-up actions

Format your response as JSON:
{
  "reportType": "Type of report",
  "summary": "Overall summary in plain English",
  "metrics": [
    {
      "name": "Metric name",
      "value": "The value",
      "normalRange": "Normal range",
      "status": "Normal|Borderline|Abnormal",
      "explanation": "What this means in plain English"
    }
  ],
  "concerns": ["Any concerning findings"],
  "recommendations": ["Suggested follow-up actions"],
  "disclaimer": "This is not a medical diagnosis. Please consult a healthcare professional."
}`,

    reportImageExplainer: `You are MediSense AI, a medical report interpreter with vision capabilities. You can read and analyze images of medical reports, lab results, prescriptions, X-rays, skin conditions, and other medical documents.

When given a medical image:
1. Carefully read and extract all text, values, and findings from the image
2. Identify the type of report or medical document
3. Break down each metric/value you can read
4. Highlight abnormal values
5. Explain what they mean in plain English
6. Suggest follow-up actions

Format your response as JSON:
{
  "reportType": "Type of report/document identified",
  "summary": "Overall summary in plain English of what the image shows",
  "metrics": [
    {
      "name": "Metric name",
      "value": "The value read from image",
      "normalRange": "Normal range",
      "status": "Normal|Borderline|Abnormal",
      "explanation": "What this means in plain English"
    }
  ],
  "concerns": ["Any concerning findings"],
  "recommendations": ["Suggested follow-up actions"],
  "disclaimer": "This interpretation is based on AI image analysis and is not a medical diagnosis. Please consult a healthcare professional."
}`,

    drugInteraction: `You are MediSense AI, a drug interaction checking assistant. Analyze medication combinations for potential interactions.

When given a list of medications:
1. Check for known drug-drug interactions
2. Rate interaction severity
3. Explain the mechanism
4. Suggest alternatives if dangerous

Format your response as JSON:
{
  "medications": ["med1", "med2"],
  "interactions": [
    {
      "drugs": ["drug1", "drug2"],
      "severity": "None|Mild|Moderate|Severe|Critical",
      "severityColor": "#22c55e|#f59e0b|#ef4444|#dc2626|#7c2d12",
      "description": "What happens",
      "mechanism": "How/why it happens",
      "recommendation": "What to do"
    }
  ],
  "safeToTakeTogether": true|false,
  "generalAdvice": "Overall advice",
  "disclaimer": "Always consult your pharmacist or doctor before changing medications."
}`,

    healthChat: `You are MediSense AI, a friendly and knowledgeable health companion chatbot. You provide general health information, wellness tips, and emotional support.

Guidelines:
- Be warm, empathetic, and supportive
- Provide evidence-based health information
- Never diagnose or prescribe
- Always recommend consulting professionals for serious concerns
- Use simple, accessible language
- Include relevant emojis to make responses engaging
- Keep responses concise but helpful (2-4 paragraphs max)

Always end with a disclaimer if discussing health conditions.`,

    emergency: `You are MediSense AI Emergency Triage Assistant. You provide immediate first-aid guidance and emergency assessment. This is a CRITICAL feature — be precise and actionable.

IMPORTANT: You are NOT replacing emergency services. Always advise calling emergency services for serious situations.

When given an emergency situation:
1. Assess urgency level
2. Determine if emergency services should be called
3. Provide step-by-step immediate actions
4. List things NOT to do
5. Be very specific and actionable

Format your response as JSON:
{
  "urgencyLevel": "Critical|High|Moderate|Low",
  "callEmergency": true|false,
  "assessment": "Brief assessment of the situation",
  "immediateSteps": ["Step 1: Do this...", "Step 2: Then do this..."],
  "doNotDo": ["Don't do this", "Avoid this"],
  "disclaimer": "This is AI-generated first-aid guidance. Always call emergency services (911/112/108) for real emergencies."
}`,

    skinAnalyzer: `You are MediSense AI, a dermatological image analysis assistant powered by advanced vision AI. You can analyze images of skin conditions to help users understand what they might be dealing with.

IMPORTANT: You are NOT a dermatologist. Always recommend consulting a dermatologist for proper diagnosis.

When given an image of a skin condition:
1. Describe what you observe in the image
2. Identify possible skin conditions that match
3. Assess the severity
4. Provide care recommendations
5. Recommend when to see a doctor

Format your response as JSON:
{
  "observation": "Detailed description of what is visible in the image",
  "possibleConditions": [
    {
      "name": "Condition name",
      "likelihood": "High|Medium|Low",
      "description": "Brief explanation of the condition"
    }
  ],
  "severity": "Mild|Moderate|Severe",
  "severityColor": "#22c55e|#f59e0b|#ef4444",
  "careRecommendations": ["recommendation1", "recommendation2"],
  "seeDoctor": true|false,
  "urgency": "Routine checkup|Within a week|Within 24 hours|Immediately",
  "disclaimer": "This is AI-based visual analysis only and NOT a medical diagnosis. Please consult a dermatologist for proper examination and treatment."
}`
};

// API Routes
app.post('/api/analyze-symptoms', async (req, res) => {
    try {
        if (!rateLimit(req.ip)) return res.status(429).json({ error: 'Too many requests. Please wait.' });
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

app.post('/api/explain-report', async (req, res) => {
    try {
        if (!rateLimit(req.ip)) return res.status(429).json({ error: 'Too many requests. Please wait.' });
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
        res.json(JSON.parse(completion.choices[0].message.content));
    } catch (error) {
        console.error('Report explanation error:', error);
        res.status(500).json({ error: 'Report analysis failed. Please try again.' });
    }
});

// NEW: Image-based report analysis
app.post('/api/explain-report-image', async (req, res) => {
    try {
        if (!rateLimit(req.ip)) return res.status(429).json({ error: 'Too many requests. Please wait.' });
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
        res.json(JSON.parse(completion.choices[0].message.content));
    } catch (error) {
        console.error('Image report analysis error:', error);
        res.status(500).json({ error: 'Image analysis failed. Please try again.' });
    }
});

app.post('/api/check-interactions', async (req, res) => {
    try {
        if (!rateLimit(req.ip)) return res.status(429).json({ error: 'Too many requests. Please wait.' });
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

app.post('/api/health-chat', async (req, res) => {
    try {
        if (!rateLimit(req.ip)) return res.status(429).json({ error: 'Too many requests. Please wait.' });
        const { messages } = req.body;
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Please provide a message.' });
        }
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPTS.healthChat },
                ...messages.slice(-10) // Keep last 10 messages for context
            ],
            temperature: 0.7
        });
        res.json({ reply: completion.choices[0].message.content });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Chat failed. Please try again.' });
    }
});

// NEW: Emergency Assessment
app.post('/api/emergency-assess', async (req, res) => {
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

// NEW: Skin Disease Analysis
app.post('/api/analyze-skin', async (req, res) => {
    try {
        if (!rateLimit(req.ip)) return res.status(429).json({ error: 'Too many requests. Please wait.' });
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

// Serve the frontend (catch-all for SPA)
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🏥 MediSense AI running on http://localhost:${PORT}`);
});
