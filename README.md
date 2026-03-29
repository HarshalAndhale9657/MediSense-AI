<![CDATA[<div align="center">

# 🏥 MediSense AI

### Your Intelligent Health Companion — Powered by GPT-4o Vision

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](LICENSE)

<br/>

**MediSense AI** is an AI-powered healthcare assistant that combines **GPT-4o's multimodal capabilities** with an intuitive, modern interface to help users understand symptoms, decode medical reports, check drug interactions, analyze skin conditions, and get emergency first-aid guidance — all in one seamless experience.

<br/>

[🚀 Getting Started](#-getting-started) · [✨ Features](#-features) · [🏗️ Architecture](#️-architecture) · [📖 API Reference](#-api-reference) · [🤝 Contributing](#-contributing)

---

</div>

<br/>

## 🌟 Why MediSense AI?

Healthcare information should be **accessible, understandable, and immediate**. MediSense AI bridges the gap between complex medical data and everyday understanding by leveraging the power of OpenAI's GPT-4o Vision model.

> **⚠️ Disclaimer:** MediSense AI is designed for **informational purposes only**. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns.

<br/>

## ✨ Features

### 🩺 AI Symptom Analyzer
Describe your symptoms in natural language and receive an intelligent analysis including:
- **Severity Assessment** — Color-coded urgency levels (Low → Emergency)
- **Possible Conditions** — Ranked by likelihood with explanations
- **Personalized Recommendations** — Home care, doctor visit, or ER guidance
- **Follow-up Questions** — For more accurate assessment

### 📋 Medical Report Explainer
Upload a photo or paste text from lab reports and get everything explained in plain English:
- **Image Upload Support** — Powered by GPT-4o Vision for reading report photos
- **Metric Breakdown** — Each value explained with normal ranges
- **Abnormal Highlights** — Instantly spot concerning values
- **Drag & Drop** — Effortless report upload experience

### 💊 Drug Interaction Checker
Enter your medications and instantly check for dangerous combinations:
- **Severity Ratings** — None / Mild / Moderate / Severe / Critical
- **Mechanism Explanations** — Understand *why* interactions occur
- **Alternative Suggestions** — Safer medication options when needed
- **Quick-Add Buttons** — Common medications at your fingertips

### 🔬 Skin Disease Analyzer
Upload a photo of any skin condition for AI-powered dermatological analysis:
- **Visual Analysis** — GPT-4o Vision examines the skin condition image
- **Condition Identification** — Possible conditions ranked by likelihood
- **Severity Assessment** — Mild / Moderate / Severe with care guidance
- **Doctor Urgency** — Know when to see a dermatologist

### 🚨 Emergency SOS
Get instant first-aid guidance and emergency triage assessment:
- **Urgency Triage** — Critical / High / Moderate / Low classification
- **Step-by-Step Instructions** — Actionable first-aid guidance
- **Safety Warnings** — What NOT to do in emergency situations
- **Emergency Numbers** — Quick access to global emergency services

### 💬 AI Health Companion Chat
A conversational AI for general health, wellness, and well-being guidance:
- **Contextual Conversations** — Maintains chat history for continuity
- **Evidence-Based Advice** — Nutrition, fitness, sleep, and mental health
- **Suggestion Chips** — Quick-start conversation topics
- **Warm & Empathetic** — Designed to feel supportive, not clinical

<br/>

## 🏗️ Architecture

```
MediSense-AI/
├── server.js              # Express backend with all API routes
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (API keys)
├── .gitignore             # Git ignore rules
├── public/                # Static frontend assets
│   ├── index.html         # Single-page application (SPA)
│   ├── css/
│   │   └── style.css      # Custom design system (~42KB)
│   └── js/
│       └── app.js         # Frontend logic & API integration (~38KB)
└── README.md
```

### Tech Stack

| Layer        | Technology                  | Purpose                               |
|:-------------|:----------------------------|:--------------------------------------|
| **AI Engine**    | OpenAI GPT-4o Vision       | Multimodal medical analysis           |
| **Backend**      | Node.js + Express 5        | RESTful API server                    |
| **Frontend**     | Vanilla JS + Custom CSS    | Single-page application               |
| **Styling**      | Custom Design System       | Glassmorphism, animations, dark theme |
| **Typography**   | Inter + JetBrains Mono     | Modern, readable UI                   |
| **Icons**        | Font Awesome 6             | Comprehensive icon set                |

<br/>

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **OpenAI API Key** with GPT-4o access ([Get one](https://platform.openai.com/api-keys))

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/HarshalAndhale9657/MediSense-AI.git
cd MediSense-AI
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

**4. Start the server**

```bash
# Production
npm start

# Development
npm run dev
```

**5. Open your browser**

Navigate to **[http://localhost:3000](http://localhost:3000)** and start using MediSense AI.

<br/>

## 📖 API Reference

All endpoints accept `POST` requests with JSON bodies and return structured JSON responses.

### Core Endpoints

| Method | Endpoint                   | Description                         | Body Parameters                      |
|:-------|:---------------------------|:------------------------------------|:-------------------------------------|
| POST   | `/api/analyze-symptoms`    | AI symptom analysis                 | `{ "symptoms": "string" }`           |
| POST   | `/api/explain-report`      | Text-based report explanation       | `{ "reportText": "string" }`         |
| POST   | `/api/explain-report-image`| Image-based report analysis         | `{ "imageBase64": "string", "additionalText?": "string" }` |
| POST   | `/api/check-interactions`  | Drug interaction check              | `{ "medications": ["string"] }`      |
| POST   | `/api/analyze-skin`        | Skin condition image analysis       | `{ "imageBase64": "string", "description?": "string" }` |
| POST   | `/api/emergency-assess`    | Emergency triage & first-aid        | `{ "situation": "string" }`          |
| POST   | `/api/health-chat`         | Conversational health chat          | `{ "messages": [{ "role": "string", "content": "string" }] }` |

### Rate Limiting

- **20 requests** per IP per **60-second** window
- Returns `429 Too Many Requests` when exceeded

<br/>

### Example Request

```bash
curl -X POST http://localhost:3000/api/analyze-symptoms \
  -H "Content-Type: application/json" \
  -d '{"symptoms": "persistent headache for 3 days with mild fever"}'
```

### Example Response

```json
{
  "severity": "Moderate",
  "severityColor": "#f59e0b",
  "possibleConditions": [
    {
      "name": "Viral Infection",
      "likelihood": "High",
      "description": "Common viral illnesses often present with headache and low-grade fever"
    }
  ],
  "recommendations": [
    "Rest and stay hydrated",
    "Monitor temperature regularly",
    "Consult a doctor if symptoms worsen or persist beyond 5 days"
  ],
  "followUpQuestions": [
    "Do you have any nasal congestion or sore throat?",
    "Have you been in contact with anyone who is sick?"
  ],
  "summary": "Your symptoms suggest a moderate condition, likely viral in origin.",
  "disclaimer": "This is not a medical diagnosis. Please consult a healthcare professional."
}
```

<br/>

## 🔒 Security & Privacy

- **No data storage** — MediSense AI does not persist any user-submitted medical data
- **Server-side API calls** — Your OpenAI API key is never exposed to the client
- **Rate limiting** — Built-in protection against excessive API usage
- **Input validation** — All user inputs are validated before processing
- **CORS enabled** — Configurable cross-origin resource sharing

<br/>

## 🗺️ Roadmap

- [ ] User authentication & session history
- [ ] PDF report upload & parsing
- [ ] Multilingual support (Hindi, Spanish, French)
- [ ] Voice-based symptom input
- [ ] Integration with wearable health devices
- [ ] Export analysis reports as PDF
- [ ] Dark / Light theme toggle

<br/>

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

<br/>

## 📄 License

This project is licensed under the **ISC License** — see the [LICENSE](LICENSE) file for details.

<br/>

## 👨‍💻 Author

**Harshal Andhale**

[![GitHub](https://img.shields.io/badge/GitHub-HarshalAndhale9657-181717?style=for-the-badge&logo=github)](https://github.com/HarshalAndhale9657)

<br/>

---

<div align="center">

**Built with ❤️ and AI for accessible healthcare**

⭐ Star this repo if you find it useful!

</div>
]]>
