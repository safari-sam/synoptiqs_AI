# AI-Enhanced EHR Patient Summary

An AI-powered clinical assistant that generates comprehensive patient summaries with citations, risk assessments, and real-time monitoring.

## 🌍 EU Compliance - Mistral AI Integration

This system uses **Mistral AI Large 3** hosted on EU servers (Paris, France) for GDPR compliance and data sovereignty.

### AI Provider Configuration

The system supports two AI providers:

1. **Mistral AI Large** (Default - EU servers)
   - Model: `mistral-large-latest`
   - Servers: Paris, France 🇫🇷
   - API: https://api.mistral.ai/v1

2. **OpenAI GPT-4o** (Fallback option)
   - Model: `gpt-4o-2024-08-06`
   - Available for comparison/testing

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd AI_patient_summary
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```bash
# Choose provider: 'mistral' or 'openai'
AI_PROVIDER=mistral

# Mistral AI API Key (get from https://console.mistral.ai/)
MISTRAL_API_KEY=your_mistral_key_here

# OpenAI API Key (optional fallback)
OPENAI_API_KEY=your_openai_key_here

# Database credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ehr_app
```

### 3. Run the Backend

```bash
python backend.py
```

You should see:
```
🤖 Using Mistral AI Large (EU servers)
✅ Database connected successfully
✅ AI configured: Mistral AI Large (EU)
✅ API Server: Running on http://127.0.0.1:8000
```

## 🎯 Features

### 1. AI-Generated Patient Summaries
- **Problem Representation**: Concise clinical synopsis
- **Clinical Trajectory**: Disease progression and response to treatment
- **Vitals Trends**: Automated trend analysis with graphs
- **Lab Trends**: Track key parameters over time
- **Medication Evolution**: Changes in treatment regimen
- **Red Flags**: Critical alerts requiring immediate attention

### 2. Citation System
- Every AI-generated fact includes inline citations `[1]`, `[2]`
- Click citations to see source visit details
- Modal popup shows: visit date, doctor, diagnosis, treatment, lab results, excerpt
- Ensures transparency and traceability for medical-legal compliance

### 3. Drug Risk Assessment
- **Drug-Drug Interactions**: Identifies potentially harmful combinations
- **Drug-Lab Effects**: Links medications to abnormal lab values
- **Contraindications**: Flags drugs that may worsen existing conditions
- Risk levels: HIGH, MODERATE, LOW
- Evidence-based recommendations with sources

### 4. Real-Time Patient Monitoring
- Watches `C:\ehr_exchange` folder for patient exports
- Auto-updates when new GDT/BDT files detected
- Background pre-loading for top 10 recent patients
- Instant cache retrieval (<100ms)

## 📊 API Endpoints

### Get Current Patient
```http
GET /api/current_patient
```

### Get Patient Summary with AI Analysis
```http
GET /api/patient/{patient_id}/summary
```

Returns:
```json
{
  "patient_data": {...},
  "ai_summary": {
    "problem_representation": "58yo M with HTN, HLD, T2DM [1]...",
    "clinical_trajectory": "BP control improved after...",
    "vitals_trends": [...],
    "lab_trends": [...],
    "citations": [
      {
        "id": 1,
        "visit_date": "2024-11-15",
        "doctor_name": "Dr. Smith",
        "diagnosis": "Essential Hypertension",
        "excerpt": "Patient started on Lisinopril 10mg..."
      }
    ]
  }
}
```

### Drug Risk Assessment
```http
GET /api/patient/{patient_id}/drug_risk_assessment
```

## 🔄 Switching AI Providers

To switch between Mistral and OpenAI:

1. Edit `.env`:
   ```bash
   AI_PROVIDER=openai  # Change to 'openai'
   ```

2. Restart the backend:
   ```bash
   python backend.py
   ```

The system will automatically use the specified provider while maintaining identical output format.

## 📦 System Architecture

```
┌─────────────────┐
│   EHR System    │
│  (BDT Export)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  File Watcher   │─────▶│  MySQL Database  │
│  (GDT/BDT)      │      │   (Patient Data) │
└────────┬────────┘      └─────────┬────────┘
         │                         │
         ▼                         ▼
┌─────────────────────────────────────────┐
│         FastAPI Backend                 │
│  - Patient data aggregation             │
│  - Parallel DB queries (4 workers)      │
│  - AI summary generation                │
│  - Drug risk assessment                 │
│  - Citation management                  │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│        Mistral AI API (EU)              │
│  - mistral-large-latest                 │
│  - Structured JSON output               │
│  - Clinical reasoning                   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│       Frontend (HTML/JS)                │
│  - AI Summary display                   │
│  - Citation rendering                   │
│  - Risk assessment UI                   │
│  - Lab/vitals graphs                    │
└─────────────────────────────────────────┘
```

## 🔒 Data Privacy & Compliance

- **EU Data Sovereignty**: All AI processing on Mistral servers in France
- **GDPR Compliant**: Patient data stays within EU infrastructure
- **No Training**: Patient data NOT used to train AI models
- **Encrypted Transit**: TLS 1.3 encryption for all API calls
- **Local Database**: Patient data stored on your local MySQL server

## 🛠️ Troubleshooting

### "AI API key not configured"
- Check your `.env` file has `MISTRAL_API_KEY` set
- Verify the key is valid at https://console.mistral.ai/

### "Database connection failed"
- Ensure MySQL is running
- Check `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `.env`

### "TypeError: Client.__init__() got an unexpected keyword argument 'proxies'"
- Upgrade packages: `pip install --upgrade "openai>=2.8.1" "httpx>=0.27.0"`

### Slow AI responses
- Mistral AI Large typically responds in 2-5 seconds
- Check your internet connection
- Verify no API rate limits at https://console.mistral.ai/

## 📝 License

Copyright © 2025. All rights reserved.

## 🤝 Support

For issues or questions:
- Open an issue on GitHub
- Check the Mistral AI documentation: https://docs.mistral.ai/
