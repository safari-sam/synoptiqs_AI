  AI-Enhanced German EHR & Clinical Summary Tool
A "Twin Architecture" solution solving the 7.5-minute consultation challenge for German physicians.

Overview
In the German outpatient sector, physicians have an average of just 7.5 minutes per patient. Up to 60% of this time is lost to "desktop medicine"—navigating legacy software, searching for lab trends, and manually synthesizing years of unstructured notes.
This project introduces the AI Summary Kit, a "Sidecar Application" that runs alongside any legacy Electronic Health Record (EHR) system. It automatically intercepts patient data via standard GDT protocols, identifies critical safety risks 
(e.g., drug interactions), and uses Generative AI to condense complex medical histories into a 30-second structured briefing.The repository includes both a full-stack Local EHR Simulator (Node.js) to mimic legacy practice software and the AI Sidecar 
(Python/PyWebView) that delivers the intelligence.


The AI Summary Tool Kit (The Core Innovation)
The heart of this project is the intelligent "Sidecar" that floats next to the doctor's main screen. It provides a real-time, context-aware summary without requiring the physician to click a single button.

Key Features
1. Zero-Click Workflow:
   - Detects when a patient is opened in the legacy EHR via a local GDT file bridge.
   - No API integration required with the legacy vendor; works via standard file exchange.
2. "Senior Physician" Clinical Handover:
  - Problem Representation: Generates a concise 1-2 sentence medical synthesis (e.g., "55F with COPD Gold II presenting for dyspnea...").
  - Context-Aware: Filters history based on the current Chief Complaint (e.g., focuses on cardiac history if the patient is here for chest pain).
  - Trajectory Tracking: Visualizes whether a condition is improving or deteriorating using longitudinal lab data.
3. Hybrid Safety Engine:
  - Local Rule Engine: Deterministic Python code checks for life-critical contraindications (e.g., "Triple Whammy" - NSAID + ACE + Diuretic) entirely offline.
  - Cloud Intelligence: Generative AI (GPT-4o) handles the summarization and trend extraction.
4. Privacy by Design (GDPR Compliant):
  - Split-Merge Architecture: PII (Name, ID, DOB) is stripped locally before data is sent to the cloud.
  - The AI processes anonymized clinical text only. The UI re-attaches patient identity locally.
  
  System Architecture.
  The solution uses a "Twin Architecture" to bridge 1990s legacy protocols with modern AI.
  
  graph LR
    A[Physician] -->|Opens Patient| B[Local EHR Simulator]
    B -->|Writes GDT File| C{Shared Folder}
    C -->|Watchdog Event| D[Python Bridge]
    
    subgraph "The Intelligence Engine"
    D -->|Local Check| E[Safety Rules]
    D -->|Anonymize| F[OpenAI API]
    end
    
    E --> G[Sidecar UI]
    F -->|Summary JSON| G
    G -->|Display| A
    
1. The Simulator (Node.js/Express)
   - Acts as the "Legacy PVS" (Practice Management System).
   - Manages a SQL database of patients, visits, and labs.
   - Dual-Mode Export: Generates both legacy BDT/GDT files (for the Sidecar) and modern FHIR R4 JSON (for future interoperability).
2. The Bridge (Python/FastAPI)
   - Monitors the file system for GDT exports.
   - Parses cryptic German GDT codes (e.g., 6200 for diagnoses) in milliseconds.
   - Orchestrates the parallel processing of Safety Rules (Local) and AI Summarization (Cloud).
3. The Sidecar UI (HTML/JS/PyWebView)
   - A lightweight, floating desktop window.
   - Updates instantly via polling.
   - Displays sparkline charts for lab trends (HbA1c, Creatinine).

Tech Stack
AI Sidecar (The Tool)
- Language: Python 3.9+
- Framework: FastAPI (Backend), PyWebView (Desktop GUI)
- AI Model: OpenAI GPT-4o
- Libraries: watchdog (File monitoring), pydantic (Data validation)

EHR Simulator (The Environment)
- Runtime: Node.js 18.x
- Framework: Express.js
- Database: MySQL / SQLite (Configurable)
- Frontend: Vanilla JS + Bootstrap (Lightweight, clinical focus)

Installation & Setup
Prerequisites
- Node.js & npm
- Python 3.9+
- OpenAI API Key
  
1. Start the EHR Simulator
   - cd server
   - npm install
   - npm start
   - # Server running at http://localhost:5000
2. Start the AI Sidecar
   - # In a new terminal
   - pip install -r requirements.txt
   - # Create a .env file with your OPENAI_API_KEY
   - python backend.py
3. Usage
   - Log in to the EHR Simulator (doctor1 / password).
   - Open a patient record (e.g., Naomi Adera).
   - Watch the AI Sidecar window automatically populate with the summary and safety alerts!

Compliance & Standards
- MIO PKA (Patientenkurzakte): The AI summary structure aligns with the German National Association of Statutory Health Insurance Physicians (KBV) standards for patient summaries.
- GDT/BDT: Fully compliant parser for the standard German medical data exchange format.
- GDPR: Implements local anonymization to ensure no PII leaves the local environment during AI processing.

License
- This project is licensed under the MIT License - see the LICENSE file for details.
- Developed for the 7.5 Minute Challenge Hackathon bavaria, Dec 2025.


