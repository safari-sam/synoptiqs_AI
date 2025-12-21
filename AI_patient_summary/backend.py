import time
import threading
import os
import uvicorn
import webview
from pathlib import Path
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import json
import mysql.connector
from mysql.connector import Error
# OpenAI imports - will be conditionally imported based on configuration
from dotenv import load_dotenv
from bdt_parser import BDTParser
from concurrent.futures import ThreadPoolExecutor, as_completed

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

# ==========================================
# 🔧 CONFIGURATION
# ==========================================

# GDT Configuration
BASE_DIR = Path(__file__).resolve().parent

watch_folder_env = os.getenv("WATCH_FOLDER")
if watch_folder_env:
    WATCH_FOLDER = Path(watch_folder_env).expanduser()
    if not WATCH_FOLDER.is_absolute():
        WATCH_FOLDER = (BASE_DIR / WATCH_FOLDER).resolve()
    else:
        WATCH_FOLDER = WATCH_FOLDER.resolve()
else:
    WATCH_FOLDER = Path(r"C:\ehr_exchange")

# Ensure watch folder exists
WATCH_FOLDER.mkdir(parents=True, exist_ok=True)

WATCH_FILE = os.getenv("WATCH_FILE", "patient_export.gdt")

# ==========================================
# 🧠 THE "7.5 MINUTE" SYSTEM PROMPT WITH CITATIONS
# ==========================================
AI_SUMMARY_SYSTEM_PROMPT = """
You are a Senior Internal Medicine Consultant assisting a colleague who has only 7.5 minutes to review a patient.
Your goal is to synthesize years of complex BDT/GDT history into a structured "Clinical Handover" WITH CITATIONS.

### INPUT DATA
You will receive unstructured patient history (visits, labs, meds, vitals) in chronological order.
Each visit, lab, medication, or vital sign has a date and context. YOU MUST CITE YOUR SOURCES.

### OUTPUT FORMAT (JSON ONLY)
You must return a valid JSON object with exactly these keys. Do not use Markdown outside the strings.

{
  "problem_representation": "Start with age and sex in full format (e.g., '55-year-old female' NOT '55F'). State disease duration explicitly with citation (e.g., 'with a 10-year history of COPD[1]' or 'diagnosed with COPD in 2015[2]'). Include key comorbidities and current trajectory in 2-3 sentences. USE [citation_id] after EVERY clinical fact.",
  
  "current_trajectory": "PRIORITIZE CURRENT VISIT CONTEXT: Analyze based on the patient's reason for visit/chief complaint from the most recent visit. For diabetic follow-up: Focus on glycemic control (HbA1c trends, glucose logs), diabetic complications (nephropathy, retinopathy, neuropathy screening results), diabetes-specific medications (metformin, insulin regimens), and foot care/dietary counseling. For hypertension management: Emphasize BP control trends, cardiovascular risk stratification, antihypertensive medications and dosing, lifestyle modifications. For renal/CKD follow-up: Focus on eGFR trends, proteinuria, electrolyte management, bone mineral metabolism, anemia workup, and dialysis planning if applicable. For respiratory complaints: Highlight lung function tests, chest imaging, respiratory medications, and infection screening. Always start with current visit reason and provide targeted, relevant clinical analysis with citations.",
  
  "vitals_trends": [
    { "metric": "Blood Pressure", "values": [{"date": "2024-01-15", "value": "145/90"}, {"date": "2024-02-10", "value": "128/82"}], "interpretation": "Improving, controlled", "citation_id": 3 },
    { "metric": "Heart Rate", "values": [{"date": "2024-01-15", "value": "88"}, {"date": "2024-02-10", "value": "74"}], "interpretation": "Normal range", "citation_id": 3 }
  ],
  
  "lab_trends": [
    { "system": "Metabolic", "metric": "HbA1c", "values": [{"date": "2023-12-01", "value": "8.2%"}, {"date": "2024-03-01", "value": "7.4%"}], "interpretation": "Improving, nearing target", "citation_id": 4 },
    { "system": "Renal", "metric": "Creatinine", "values": [{"date": "2023-12-01", "value": "3.2"}, {"date": "2024-03-01", "value": "3.4"}], "interpretation": "Stable severe", "citation_id": 4 }
  ],
  
  "medication_evolution": [
    "New: Cholestyramine 4g BID (Indication: Pruritus)[5]",
    "Continued: Sacubitril/Valsartan 97/103mg (Max tolerated dose)[3]",
    "Adjusted: Ivabradine 5mg (Rate control)[4]"
  ],
  
  "red_flags": [
    "Allergy: Aspirin[1]",
    "Risk: Seasonal exacerbation[2]"
  ],
  
  "action_plan": [
    "Schedule Spirometry",
    "Administer Influenza Vaccine"
  ],
  
  "citations": [
    {
      "id": 1,
      "visit_date": "2024-01-15",
      "doctor_name": "Dr. Kamau",
      "diagnosis": "COPD exacerbation",
      "treatment_plan": "Started prednisone taper",
      "lab_results": "WBC 12.5, CRP elevated",
      "excerpt": "Patient presented with increased dyspnea..."
    },
    {
      "id": 2,
      "visit_date": "2024-01-10",
      "doctor_name": "Dr. Njeri",
      "diagnosis": "Hypertension follow-up",
      "treatment_plan": "Continue current medications",
      "lab_results": "BP 145/90",
      "excerpt": "Blood pressure remains elevated despite..."
    }
  ]
}

### CRITICAL INSTRUCTIONS FOR CITATIONS
1. **ALWAYS Add Citation IDs:** After EVERY clinical fact, diagnosis, medication, lab value, or vital sign, add [citation_id]
2. **Match to Source Data:** Each citation_id must correspond to a specific visit, lab order, or prescription in the input data
3. **Complete Citation Objects:** Each citation must include: id, visit_date, doctor_name, diagnosis, treatment_plan, lab_results, and a brief excerpt
4. **Citation Format:** Use [1], [2], [3] format inline. Example: "Patient started on Enalapril 10mg in 2022[1]"
5. **Multiple Citations:** If one statement uses multiple sources, cite all: "BP improved from 145/90[1] to 130/80[3]"

### OTHER CRITICAL INSTRUCTIONS
1. **Age/Sex Format:** Always write '55-year-old male' or '42-year-old female' (NEVER '55M' or '42F')
2. **Disease Duration:** Always state when the condition started (year) or state 'duration unknown' if not in data
3. **Be Specific:** Do not say 'Heart meds'. Say 'Sacubitril/Valsartan'.
4. **Be Longitudinal:** For vitals and labs, provide 3-5 historical data points to show trends over time
5. **Trend Analysis:** Use "values" array to show progression: improving, worsening, stable, fluctuating
6. **System Classification:** Group lab trends by body system (Cardiac, Renal, Hepatic, Metabolic, Hematologic)
7. **Focus on WHY medication changes happened, not just a list
8. **Action Plan:** Include 2-3 specific next steps for patient management
"""

AI_SUMMARY_JSON_SCHEMA = {
    "name": "patient_summary",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "problem_representation": {"type": "string"},
            "current_trajectory": {"type": "string"},
            "vitals_trends": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "metric": {"type": "string"},
                        "values": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "date": {"type": "string"},
                                    "value": {"type": "string"}
                                },
                                "required": ["date", "value"]
                            }
                        },
                        "interpretation": {"type": "string"},
                        "citation_id": {"type": "integer"}
                    },
                    "required": ["metric", "values", "interpretation"]
                }
            },
            "lab_trends": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "system": {"type": "string"},
                        "metric": {"type": "string"},
                        "values": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "date": {"type": "string"},
                                    "value": {"type": "string"}
                                },
                                "required": ["date", "value"]
                            }
                        },
                        "interpretation": {"type": "string"},
                        "citation_id": {"type": "integer"}
                    },
                    "required": ["metric", "values", "interpretation"]
                }
            },
            "medication_evolution": {
                "type": "array",
                "items": {"type": "string"}
            },
            "red_flags": {
                "type": "array",
                "items": {"type": "string"}
            },
            "action_plan": {
                "type": "array",
                "items": {"type": "string"}
            },
            "citations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "visit_date": {"type": "string"},
                        "doctor_name": {"type": "string"},
                        "diagnosis": {"type": "string"},
                        "treatment_plan": {"type": "string"},
                        "lab_results": {"type": "string"},
                        "excerpt": {"type": "string"}
                    },
                    "required": ["id", "visit_date", "doctor_name"]
                }
            }
        },
        "required": [
            "problem_representation",
            "current_trajectory",
            "vitals_trends",
            "lab_trends",
            "medication_evolution",
            "red_flags",
            "action_plan",
            "citations"
        ]
    }
}


def build_error_summary(message: str) -> Dict[str, Any]:
    return {
        "error": message,
        "problem_representation": "Error generating summary",
        "current_trajectory": "Unable to process patient data",
        "vitals_trends": [],
        "lab_trends": [],
        "medication_evolution": [],
        "red_flags": [],
        "action_plan": [],
        "citations": []
    }


def extract_json_from_response(response) -> Dict[str, Any]:
    """Extract concatenated text content from a Responses API call and parse JSON."""
    if not response:
        raise ValueError("Empty OpenAI response object")

    # Prefer the convenience attribute when available
    raw_text = getattr(response, "output_text", None)

    if not raw_text:
        segments: List[str] = []
        for item in getattr(response, "output", []):
            for content in getattr(item, "content", []):
                text = getattr(content, "text", None)
                if text:
                    segments.append(text)
        raw_text = "".join(segments)

    if not raw_text:
        raise ValueError("OpenAI response did not contain any text output")

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as exc:
        # Attempt to salvage by slicing to outermost braces
        cleaned = raw_text.strip()
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1 and end > start:
            snippet = cleaned[start:end + 1]
            try:
                return json.loads(snippet)
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Failed to parse JSON output: {exc}")


def extract_json_from_chat_completion(response) -> Dict[str, Any]:
    if not response or not getattr(response, "choices", None):
        raise ValueError("Empty chat completion response")

    message = response.choices[0].message
    content = getattr(message, "content", None)
    if not content:
        raise ValueError("Chat completion did not contain message content")

    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                text_value = item.get("text")
                if text_value:
                    parts.append(text_value)
            elif isinstance(item, str):
                parts.append(item)
        content = "".join(parts)

    if not isinstance(content, str):
        raise ValueError("Chat completion returned unsupported content format")

    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        cleaned = content.strip()
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1 and end > start:
            snippet = cleaned[start:end + 1]
            try:
                return json.loads(snippet)
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Failed to parse JSON output: {exc}")


def call_openai_for_summary(prompt: str, temperature: float = 0.2) -> Dict[str, Any]:
    """Generate AI summary using OpenAI GPT-4o mini"""
    if not ai_client:
        return build_error_summary("OpenAI API not configured")

    try:
        # Call OpenAI with structured output
        response = ai_client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {"role": "system", "content": AI_SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=temperature,
            max_tokens=3000,
            response_format={"type": "json_object"}
        )

        summary = extract_json_from_chat_completion(response)
        
        # Log what we received
        print(f"📋 OpenAI returned keys: {list(summary.keys())}")
        if 'problem_representation' in summary:
            print(f"✅ New format detected")
        elif 'patient_status' in summary:
            print(f"⚠️ Old format detected - converting...")
            # Convert old format to new format
            summary = {
                "problem_representation": summary.get("patient_status", "No summary available"),
                "current_trajectory": summary.get("medication_summary", "No trajectory data"),
                "vitals_trends": [],
                "lab_trends": [],
                "medication_evolution": summary.get("current_medications", []),
                "red_flags": summary.get("red_flags", [])
            }
        
        return summary

    except Exception as e:
        print(f"❌ OpenAI summary request failed: {e}")
        import traceback
        traceback.print_exc()
        return build_error_summary(str(e))

# ==========================================
# 🧪 DRUG INTERACTION & RISK ASSESSMENT AI
# ==========================================

AI_DRUG_RISK_SYSTEM_PROMPT = """
You are a Clinical Pharmacology Expert analyzing medication interactions and drug-induced adverse effects.

### INPUT DATA
You will receive:
1. List of current medications
2. Lab results (recent values)
3. Patient's chronic conditions
4. Patient allergies

### YOUR TASK
Identify and report:

1. **Drug-Drug Interactions (DDIs)**: Major interactions with significant clinical consequences
2. **Drug-Induced Lab Abnormalities**: Medications that may directly cause or contribute to abnormal lab values
3. **Drug-Disease Interactions**: Medications that may worsen existing conditions

### OUTPUT FORMAT (JSON ONLY)
Return a valid JSON object with this structure:

{
  "drug_interactions": [
    {
      "drugs": ["Drug A", "Drug B"],
      "risk_level": "HIGH|MODERATE|LOW",
      "interaction": "Brief description of the interaction mechanism",
      "clinical_effect": "Expected clinical manifestation or risk",
      "recommendation": "Specific action (monitor, adjust dose, consider alternative, etc.)",
      "source": "Single authoritative reference (e.g., Lexicomp, UpToDate, FDA label)"
    }
  ],
  "drug_lab_effects": [
    {
      "medication": "Drug name",
      "lab_parameter": "Lab test affected",
      "current_value": "Patient's current value",
      "risk_level": "HIGH|MODERATE|LOW",
      "mechanism": "How the drug affects this parameter",
      "clinical_significance": "Why this matters for this patient",
      "recommendation": "What to do (continue monitoring, dose adjustment, alternative, etc.)",
      "source": "Single authoritative reference"
    }
  ],
  "contraindications": [
    {
      "medication": "Drug name",
      "issue": "Allergy, condition, or lab finding",
      "risk_level": "HIGH|MODERATE|LOW",
      "reason": "Why this is contraindicated",
      "recommendation": "Immediate action needed",
      "source": "Single authoritative reference"
    }
  ]
}

### CRITICAL RULES
1. **Only report MAJOR risks** - Focus on serious, clinically significant interactions
2. **HIGH risk** = Life-threatening, organ damage, severe adverse effects
3. **MODERATE risk** = Significant clinical concern requiring intervention
4. **LOW risk** = Monitor but usually manageable
5. **Be specific** - Name exact drugs, exact lab values, exact mechanisms
6. **Cite sources** - Use real, verifiable references (Lexicomp, UpToDate, FDA, major journals)
7. **Actionable** - Every recommendation must be clear and implementable
8. **Current values** - Always reference the patient's actual current lab values
9. **No false alarms** - Don't include theoretical risks without clinical significance
10. **Prioritize** - Most serious risks first

### EXAMPLES OF WHAT TO REPORT
- Warfarin + NSAIDs (bleeding risk)
- Metformin with elevated creatinine (lactic acidosis risk)
- Statins causing elevated liver enzymes or CK
- ACE inhibitors with hyperkalemia
- Loop diuretics causing hyponatremia or hypokalemia
- Aminoglycosides with rising creatinine (nephrotoxicity)
- Antipsychotics with QTc prolongation

### WHAT NOT TO REPORT
- Theoretical interactions without clinical data
- Minor monitoring recommendations for stable patients
- Drug-food interactions unless severe
- Interactions already well-managed based on current labs
"""

def generate_drug_risk_assessment(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate AI-powered drug interaction and risk assessment"""
    if not openai_client:
        return {
            "error": "OpenAI API not configured",
            "drug_interactions": [],
            "drug_lab_effects": [],
            "contraindications": []
        }
    
    try:
        # Extract patient info
        patient = patient_data.get('patient', {})
        
        # Extract medications from patient record
        medications = patient.get('medications', [])
        if isinstance(medications, str):
            medications = json.loads(medications) if medications else []
        
        # Also get medications from recent prescriptions
        prescriptions = patient_data.get('prescriptions', [])
        if prescriptions:
            for rx in prescriptions[:10]:  # Last 10 prescriptions
                med_name = rx.get('medication_name', '')
                dosage = rx.get('dosage', '')
                if med_name:
                    med_str = f"{med_name} {dosage}".strip()
                    if med_str not in medications:
                        medications.append(med_str)
        
        chronic_conditions = patient.get('chronic_conditions', [])
        if isinstance(chronic_conditions, str):
            chronic_conditions = json.loads(chronic_conditions) if chronic_conditions else []
        
        allergies = patient.get('allergies', [])
        if isinstance(allergies, str):
            allergies = json.loads(allergies) if allergies else []
        
        # Get recent lab results
        lab_orders = patient_data.get('lab_orders', [])
        recent_labs = []
        for lab in lab_orders[:10]:  # Last 10 lab results
            if lab.get('result') and lab.get('status') == 'completed':
                recent_labs.append({
                    'test': lab.get('test_name', 'Unknown'),
                    'value': lab.get('result', 'N/A'),
                    'date': lab.get('result_date', lab.get('ordered_at'))
                })
        
        # Format input for AI
        input_text = f"""
PATIENT MEDICATION PROFILE:

Current Medications:
{chr(10).join(f"- {med}" for med in medications) if medications else "None recorded"}

Chronic Conditions:
{chr(10).join(f"- {cond}" for cond in chronic_conditions) if chronic_conditions else "None recorded"}

Known Allergies:
{chr(10).join(f"- {allergy}" for allergy in allergies) if allergies else "None recorded"}

Recent Lab Results:
{chr(10).join(f"- {lab['test']}: {lab['value']} ({lab['date']})" for lab in recent_labs) if recent_labs else "No recent labs"}

Analyze for drug-drug interactions, drug-induced lab abnormalities, and contraindications.
Focus ONLY on clinically significant risks requiring intervention.
"""
        
        print(f"🧪 Generating drug risk assessment with OpenAI...")
        print(f"   Medications to analyze: {medications}")
        print(f"   Recent labs: {len(recent_labs)} results")
        
        # Use OpenAI for drug risk assessment
        response = ai_client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {"role": "system", "content": AI_DRUG_RISK_SYSTEM_PROMPT},
                {"role": "user", "content": input_text}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=2000
        )
        
        result = json.loads(response.choices[0].message.content)
        print(f"✅ OpenAI drug risk assessment generated")
        return result
        
    except Exception as e:
        print(f"❌ Drug risk assessment failed: {e}")
        import traceback
        traceback.print_exc()
        return {
            "error": str(e),
            "drug_interactions": [],
            "drug_lab_effects": [],
            "contraindications": []
        }

FULL_PATH = (WATCH_FOLDER / WATCH_FILE).resolve()

# HTML File Path (points to the sidecar HTML in this workspace)
html_file_env = os.getenv("HTML_FILE_PATH")
if html_file_env:
    HTML_FILE_PATH = Path(html_file_env)
    if not HTML_FILE_PATH.is_absolute():
        HTML_FILE_PATH = (BASE_DIR / HTML_FILE_PATH).resolve()
    else:
        HTML_FILE_PATH = HTML_FILE_PATH.resolve()
else:
    HTML_FILE_PATH = (BASE_DIR / "ai-enhanced-ehr-complete.html").resolve()

# Database Configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'ehr_app')
}

# Medatixx Database Configuration (German Medical Practice Data)
MEDATIXX_DB_CONFIG = {
    'host': os.getenv('MEDATIXX_DB_HOST', 'localhost'),
    'port': int(os.getenv('MEDATIXX_DB_PORT', 3306)),
    'user': os.getenv('MEDATIXX_DB_USER', 'root'),
    'password': os.getenv('MEDATIXX_DB_PASSWORD', ''),
    'database': os.getenv('MEDATIXX_DB_NAME', 'medatixx')
}

# AI Model Configuration - Microsoft Foundry
FOUNDRY_API_KEY = os.getenv('FOUNDRY_API_KEY')
FOUNDRY_ENDPOINT = os.getenv('FOUNDRY_ENDPOINT')
FOUNDRY_API_VERSION = os.getenv('FOUNDRY_API_VERSION', '2024-05-01-preview')
FOUNDRY_DEPLOYMENT_NAME = os.getenv('FOUNDRY_DEPLOYMENT_NAME', 'gpt-4o-mini')

# OpenAI Configuration (fallback)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
AI_PROVIDER = os.getenv('AI_PROVIDER', 'azure').lower()

# Initialize AI client based on provider
ai_client = None
AI_MODEL = None

if AI_PROVIDER == 'openai' and OPENAI_API_KEY:
    from openai import OpenAI
    ai_client = OpenAI(api_key=OPENAI_API_KEY)
    AI_MODEL = 'gpt-4o-mini'
    print(f"🤖 Using OpenAI - Model: {AI_MODEL}")
    print(f"🔑 API Key configured: {OPENAI_API_KEY[:10]}...")
elif FOUNDRY_API_KEY and FOUNDRY_ENDPOINT:
    from openai import AzureOpenAI
    ai_client = AzureOpenAI(
        api_key=FOUNDRY_API_KEY,
        api_version=FOUNDRY_API_VERSION,
        azure_endpoint=FOUNDRY_ENDPOINT
    )
    AI_MODEL = FOUNDRY_DEPLOYMENT_NAME
    print(f"🤖 Using Microsoft Foundry - Model: {AI_MODEL}")
    print(f"🔑 API Key configured: {FOUNDRY_API_KEY[:10]}...")
    print(f"🌐 Endpoint: {FOUNDRY_ENDPOINT}")
else:
    print("⚠️  No AI API key found")
    print("   Configure either:")
    print("   - OPENAI_API_KEY + AI_PROVIDER=openai")
    print("   - FOUNDRY_API_KEY + FOUNDRY_ENDPOINT")

# Keep legacy variable for backward compatibility
openai_client = ai_client

# ==========================================
# 🚀 FASTAPI APP
# ==========================================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 📊 GLOBAL STATE
# ==========================================

current_patient = {
    "id": "--",
    "firstname": "Awaiting",
    "lastname": "patient update",
    "dob": "--",
    "diagnoses": [],
    "medications": []
}

# Cache for AI summaries to avoid repeated API calls
ai_summary_cache = {}
visit_reason_cache = {}

# Background pre-loading function
def preload_recent_patients():
    """Pre-generate AI summaries for recent patients in background"""
    try:
        connection = get_db_connection()
        if not connection:
            return
        
        cursor = connection.cursor(dictionary=True)
        # Get top 10 most recently updated patients
        query = """
            SELECT DISTINCT p.id
            FROM patients p
            LEFT JOIN visits v ON p.id = v.patient_id
            WHERE p.id IS NOT NULL
            ORDER BY COALESCE(v.visit_date, p.created_at) DESC
            LIMIT 10
        """
        cursor.execute(query)
        recent_patients = cursor.fetchall()
        cursor.close()
        connection.close()
        
        if recent_patients:
            print(f"🔄 Pre-loading summaries for {len(recent_patients)} recent patients...")
            
            for patient_row in recent_patients:
                patient_id = patient_row['id']
                cache_key = str(patient_id)
                
                # Skip if already cached and fresh
                if cache_key in ai_summary_cache:
                    cached = ai_summary_cache[cache_key]
                    age = (datetime.now() - cached['generated_at']).total_seconds()
                    if age < 3600:  # Less than 1 hour old
                        continue
                
                try:
                    patient_data = get_comprehensive_patient_data(patient_id)
                    if patient_data:
                        ai_summary = generate_ai_summary(patient_data)
                        ai_summary_cache[cache_key] = {
                            'summary': ai_summary,
                            'generated_at': datetime.now(),
                            'patient_data': patient_data
                        }
                        print(f"  ✅ Pre-loaded patient {patient_id}")
                except Exception as e:
                    print(f"  ⚠️ Failed to pre-load patient {patient_id}: {e}")
            
            print(f"✅ Pre-loading complete: {len(ai_summary_cache)} patients cached")
    except Exception as e:
        print(f"❌ Pre-loading error: {e}")

@app.on_event("startup")
async def startup_event():
    """Run background tasks on startup"""
    # Skip pre-loading if requested
    if os.getenv('SKIP_PRELOAD'):
        print("⏩ Pre-loading skipped")
        return
    # Start pre-loading in background thread to not block startup
    threading.Thread(target=preload_recent_patients, daemon=True).start()
    print("🚀 Background pre-loading initiated")

def parse_lab_date(value: Optional[str]) -> Optional[datetime]:
    """Parse flexible lab/date strings into datetime when possible."""
    if not value:
        return None

    if isinstance(value, datetime):
        return value

    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())

    candidate = str(value).strip()
    for fmt in ('%Y-%m-%d', '%d.%m.%Y', '%m/%d/%Y', '%d/%m/%Y'):
        try:
            return datetime.strptime(candidate, fmt)
        except ValueError:
            continue

    # Try ISO parsing as a fallback
    try:
        return datetime.fromisoformat(candidate)
    except ValueError:
        return None

# ==========================================
# 🗄️ DATABASE FUNCTIONS
# ==========================================

def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"❌ Database connection error: {e}")
        return None

def get_medatixx_connection():
    """Create and return a connection to the medatixx database"""
    try:
        connection = mysql.connector.connect(**MEDATIXX_DB_CONFIG)
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"❌ Medatixx database connection error: {e}")
        return None

def get_patient_by_name(firstname: str, lastname: str):
    """Find patient in database by name"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT * FROM patients 
            WHERE first_name = %s AND last_name = %s 
            ORDER BY id DESC LIMIT 1
        """
        cursor.execute(query, (firstname, lastname))
        patient = cursor.fetchone()
        cursor.close()
        connection.close()
        return patient
    except Error as e:
        print(f"❌ Error fetching patient: {e}")
        return None

def get_patient_visits(patient_id: int, limit: int = 10):
    """Get patient's recent visits with full details"""
    connection = get_db_connection()
    if not connection:
        return []
    
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT * FROM visits 
            WHERE patient_id = %s 
            ORDER BY visit_date DESC 
            LIMIT %s
        """
        cursor.execute(query, (patient_id, limit))
        visits = cursor.fetchall()
        cursor.close()
        connection.close()
        return visits
    except Error as e:
        print(f"❌ Error fetching visits: {e}")
        return []

def get_patient_prescriptions(patient_id: int, limit: int = 20):
    """Get patient's prescriptions"""
    connection = get_db_connection()
    if not connection:
        return []
    
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT * FROM prescriptions 
            WHERE patient_id = %s 
            ORDER BY created_at DESC 
            LIMIT %s
        """
        cursor.execute(query, (patient_id, limit))
        prescriptions = cursor.fetchall()
        cursor.close()
        connection.close()
        return prescriptions
    except Error as e:
        print(f"❌ Error fetching prescriptions: {e}")
        return []

def get_patient_lab_orders(patient_id: int, limit: int = 20):
    """Get patient's lab orders"""
    connection = get_db_connection()
    if not connection:
        return []
    
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT * FROM lab_orders 
            WHERE patient_id = %s 
            ORDER BY ordered_at DESC 
            LIMIT %s
        """
        cursor.execute(query, (patient_id, limit))
        labs = cursor.fetchall()
        cursor.close()
        connection.close()
        return labs
    except Error as e:
        print(f"❌ Error fetching lab orders: {e}")
        return []

def get_patient_radiology_orders(patient_id: int, limit: int = 20):
    """Get patient's radiology orders"""
    connection = get_db_connection()
    if not connection:
        return []
    
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT * FROM radiology_orders 
            WHERE patient_id = %s 
            ORDER BY ordered_at DESC 
            LIMIT %s
        """
        cursor.execute(query, (patient_id, limit))
        radiology = cursor.fetchall()
        cursor.close()
        connection.close()
        return radiology
    except Error as e:
        print(f"❌ Error fetching radiology orders: {e}")
        return []

def get_comprehensive_patient_data(patient_id: int):
    """Gather all patient data for AI analysis with parallel queries"""
    patient = get_patient_by_id(patient_id)
    if not patient:
        return None
    
    # Run all queries in parallel for faster loading
    data = {'patient': patient}
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            'visits': executor.submit(get_patient_visits, patient_id),
            'prescriptions': executor.submit(get_patient_prescriptions, patient_id),
            'lab_orders': executor.submit(get_patient_lab_orders, patient_id),
            'radiology_orders': executor.submit(get_patient_radiology_orders, patient_id)
        }
        
        for key, future in futures.items():
            try:
                data[key] = future.result(timeout=5)
            except Exception as e:
                print(f"⚠️ Error fetching {key}: {e}")
                data[key] = []
    
    return data

def get_patient_by_id(patient_id: int):
    """Get patient by ID"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor(dictionary=True)
        query = "SELECT * FROM patients WHERE id = %s"
        cursor.execute(query, (patient_id,))
        patient = cursor.fetchone()
        cursor.close()
        connection.close()
        return patient
    except Error as e:
        print(f"❌ Error fetching patient by ID: {e}")
        return None

# ==========================================
# 🏥 MEDATIXX DATABASE FUNCTIONS (German Medical Practice Data)
# ==========================================

def search_medatixx_categories(search_term: str, limit: int = 10):
    """Search for medical categories in medatixx database"""
    connection = get_medatixx_connection()
    if not connection:
        return []
    
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT Kategorie, KategorieLangtext, COUNT(*) as count
            FROM feldbeschreibungen 
            WHERE Kategorie LIKE %s OR KategorieLangtext LIKE %s
            GROUP BY Kategorie, KategorieLangtext
            ORDER BY count DESC, Kategorie
            LIMIT %s
        """
        search_pattern = f"%{search_term}%"
        cursor.execute(query, (search_pattern, search_pattern, limit))
        results = cursor.fetchall()
        cursor.close()
        connection.close()
        return results
    except Error as e:
        print(f"❌ Error searching medatixx categories: {e}")
        return []

def get_medatixx_form_templates(category: str = None, limit: int = 20):
    """Get medical form templates from medatixx database"""
    connection = get_medatixx_connection()
    if not connection:
        return []
    
    try:
        cursor = connection.cursor(dictionary=True)
        if category:
            query = """
                SELECT Nummer, Suchwort, Kategorie, KategorieLangtext, Format, Maske
                FROM feldbeschreibungen 
                WHERE Kategorie = %s
                ORDER BY Nummer
                LIMIT %s
            """
            cursor.execute(query, (category, limit))
        else:
            query = """
                SELECT Nummer, Suchwort, Kategorie, KategorieLangtext, Format, Maske
                FROM feldbeschreibungen 
                ORDER BY Kategorie, Nummer
                LIMIT %s
            """
            cursor.execute(query, (limit,))
        
        results = cursor.fetchall()
        cursor.close()
        connection.close()
        return results
    except Error as e:
        print(f"❌ Error fetching medatixx templates: {e}")
        return []

def search_medatixx_forms(search_term: str, limit: int = 10):
    """Search for specific forms in medatixx database"""
    connection = get_medatixx_connection()
    if not connection:
        return []
    
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT Nummer, Suchwort, Kategorie, KategorieLangtext, Format, ProgrammName
            FROM feldbeschreibungen 
            WHERE Suchwort LIKE %s 
               OR KategorieLangtext LIKE %s 
               OR Format LIKE %s
            ORDER BY Kategorie, Nummer
            LIMIT %s
        """
        search_pattern = f"%{search_term}%"
        cursor.execute(query, (search_pattern, search_pattern, search_pattern, limit))
        results = cursor.fetchall()
        cursor.close()
        connection.close()
        return results
    except Error as e:
        print(f"❌ Error searching medatixx forms: {e}")
        return []

def get_medatixx_statistics():
    """Get statistics about the medatixx database content"""
    connection = get_medatixx_connection()
    if not connection:
        return {}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get total records
        cursor.execute("SELECT COUNT(*) as total FROM feldbeschreibungen")
        total = cursor.fetchone()['total']
        
        # Get categories breakdown
        cursor.execute("""
            SELECT Kategorie, KategorieLangtext, COUNT(*) as count 
            FROM feldbeschreibungen 
            GROUP BY Kategorie, KategorieLangtext 
            ORDER BY count DESC
        """)
        categories = cursor.fetchall()
        
        # Get most common search terms
        cursor.execute("""
            SELECT Suchwort, Kategorie, COUNT(*) as count 
            FROM feldbeschreibungen 
            WHERE Suchwort IS NOT NULL AND Suchwort != ''
            GROUP BY Suchwort, Kategorie 
            ORDER BY count DESC 
            LIMIT 10
        """)
        popular_terms = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return {
            'total_records': total,
            'categories': categories,
            'popular_terms': popular_terms
        }
    except Error as e:
        print(f"❌ Error getting medatixx statistics: {e}")
        return {}

# ==========================================
# 🤖 AI ANALYSIS FUNCTIONS
# ==========================================

def format_patient_data_for_ai(data: Dict[str, Any]) -> str:
    """Format patient data into a comprehensive prompt for OpenAI with visit reason focus"""
    
    patient = data['patient']
    visits = data['visits']
    prescriptions = data['prescriptions']
    labs = data['lab_orders']
    radiology = data['radiology_orders']
    
    # Extract reason for visit from most recent visit data
    visit_reason = {}
    if visits and len(visits) > 0:
        latest_visit = visits[0]  # Visits should be sorted by date desc
        if 'reason_for_visit' in latest_visit and latest_visit['reason_for_visit']:
            visit_reason['primary_reason'] = latest_visit['reason_for_visit']
            visit_reason['detailed_reason'] = latest_visit['reason_for_visit']
            visit_reason['visit_type'] = 'Follow-up'
            visit_reason['priority_level'] = 'Normal'
        elif 'chief_complaint' in latest_visit and latest_visit['chief_complaint']:
            # Fallback to chief complaint if reason_for_visit not available
            visit_reason['primary_reason'] = latest_visit['chief_complaint']
            visit_reason['detailed_reason'] = latest_visit['chief_complaint']
            visit_reason['visit_type'] = 'Follow-up'
            visit_reason['priority_level'] = 'Normal'
    
    # Calculate age
    age = "Unknown"
    if patient.get('date_of_birth'):
        try:
            dob_val = patient['date_of_birth']
            if isinstance(dob_val, str):
                dob = parse_lab_date(dob_val)
            elif isinstance(dob_val, date):
                dob = datetime.combine(dob_val, datetime.min.time())
            else:
                dob = None
            
            if dob:
                age = (datetime.now() - dob).days // 365
        except:
            pass
    
    # --- START OF DATA DUMP WITH VISIT REASON FOCUS ---
    prompt = f"""
PATIENT DATA DUMP:

0. CURRENT VISIT REASON - PRIMARY FOCUS FOR ANALYSIS
"""
    
    if visit_reason:
        prompt += f"""- Primary Reason: {visit_reason.get('primary_reason', 'Not specified')}
- Visit Type: {visit_reason.get('visit_type', 'Not specified')}
- Priority: {visit_reason.get('priority_level', 'Normal')}
- Detailed Reason: {visit_reason.get('detailed_reason', 'Not provided')}
- Referring Doctor: {visit_reason.get('referring_doctor', 'None')}

INSTRUCTION: Focus your analysis specifically on data related to "{visit_reason.get('primary_reason', 'general care')}" and "{visit_reason.get('detailed_reason', '')[:50]}...". Prioritize relevant historical data, medications, lab trends, and vitals related to this specific concern.

"""
    else:
        prompt += "- No specific reason provided - provide general clinical summary\n\n"

    prompt += f"""1. DEMOGRAPHICS
- Name: {patient.get('first_name')} {patient.get('last_name')}
- Age: {age}
- Allergies: {patient.get('allergies', 'None')}
- Chronic Conditions: {patient.get('chronic_conditions', 'None')}

2. VISIT HISTORY ({len(visits)} records) - FOCUS ON VISITS RELATED TO CURRENT REASON
"""
    
    # Add visit details with relevance scoring based on visit reason
    for i, visit in enumerate(visits[:10], 1):
        visit_date = visit.get('visit_date', 'Unknown date')
        diagnosis = visit.get('diagnosis', 'N/A')
        plan = visit.get('treatment_plan', 'N/A')
        
        # Ensure diagnosis and plan are strings for safety
        diagnosis = str(diagnosis) if diagnosis is not None else 'N/A'
        plan = str(plan) if plan is not None else 'N/A'
        
        # Mark relevant visits based on visit reason keywords
        relevance_marker = ""
        if visit_reason:
            reason_keywords = visit_reason.get('primary_reason', '').lower()
            detailed_reason = visit_reason.get('detailed_reason', '').lower()
            if any(keyword in diagnosis.lower() or keyword in plan.lower() for keyword in [
                reason_keywords, 'diabetes' if 'diabetic' in detailed_reason else '',
                'hypertension' if 'hypertension' in detailed_reason else '',
                'renal' if 'renal' in detailed_reason or 'kidney' in detailed_reason else '',
                'epilepsy' if 'epilepsy' in detailed_reason else ''
            ] if keyword):
                relevance_marker = " ⭐ HIGHLY RELEVANT TO CURRENT VISIT"
        
        prompt += f"   [{visit_date}] Dx: {diagnosis} | Plan: {plan}{relevance_marker}\n"
        
        # Add vitals if available
        vitals = visit.get('vitals_json')
        if vitals:
            prompt += f"   > Vitals: {vitals}\n"

    # Add medications with focus on relevant ones
    prompt += f"\n3. MEDICATIONS ({len(prescriptions)} records) - HIGHLIGHT RELEVANT TO VISIT REASON\n"
    seen_meds = set()
    for rx in prescriptions[:25]:
        med_name = rx.get('medication_name', '')
        name = str(med_name).lower() if med_name is not None else ''
        if name and name not in seen_meds:
            # Mark medications relevant to visit reason
            relevance_marker = ""
            if visit_reason:
                detailed_reason = visit_reason.get('detailed_reason', '').lower()
                if any(condition in detailed_reason for condition in [
                    'diabetes', 'diabetic', 'glucose', 'insulin',
                    'hypertension', 'blood pressure', 'cardiac',
                    'renal', 'kidney', 'dialysis',
                    'epilepsy', 'seizure', 'neurological'
                ]):
                    if any(med_type in name for med_type in [
                        'metformin', 'insulin', 'glyburide', 'glipizide',  # diabetes
                        'lisinopril', 'amlodipine', 'hydrochlorothiazide', 'losartan',  # hypertension
                        'furosemide', 'spironolactone', 'dialysis',  # renal
                        'levetiracetam', 'phenytoin', 'carbamazepine', 'valproic'  # epilepsy
                    ]):
                        relevance_marker = " ⭐ RELEVANT TO VISIT"
            
            prompt += f"   - {rx.get('medication_name')} {rx.get('dosage','')} {rx.get('frequency','')}{relevance_marker}\n"
            seen_meds.add(name)
    
    # Add lab results with focus on relevant tests
    prompt += f"\n4. LAB RESULTS ({len(labs)} records) - PRIORITIZE RELEVANT TO VISIT REASON\n"
    for lab in labs[:25]:
        lab_test_name = lab.get('test_name', '')
        test_name = str(lab_test_name).lower() if lab_test_name is not None else ''
        relevance_marker = ""
        
        if visit_reason:
            detailed_reason = visit_reason.get('detailed_reason', '').lower()
            if any(condition in detailed_reason for condition in [
                'diabetes', 'diabetic', 'glucose'
            ]) and any(test in test_name for test in ['hba1c', 'glucose', 'fructosamine']):
                relevance_marker = " ⭐ KEY FOR DIABETES CARE"
            elif any(condition in detailed_reason for condition in [
                'hypertension', 'cardiac', 'heart'
            ]) and any(test in test_name for test in ['lipid', 'cholesterol', 'ecg', 'troponin']):
                relevance_marker = " ⭐ KEY FOR CARDIAC CARE"
            elif any(condition in detailed_reason for condition in [
                'renal', 'kidney', 'dialysis'
            ]) and any(test in test_name for test in ['creatinine', 'urea', 'egfr', 'potassium', 'phosphorus']):
                relevance_marker = " ⭐ KEY FOR RENAL CARE"
        
        prompt += f"   [{lab.get('ordered_at')}] {lab.get('test_name')}: {lab.get('result', 'Pending')}{relevance_marker}\n"
    
    # Add radiology with relevance
    if radiology:
        prompt += f"\n5. RADIOLOGY ({len(radiology)} records)\n"
        for rad in radiology[:5]:
            prompt += f"   [{rad.get('ordered_at')}] {rad.get('test_name')}: {rad.get('result', 'Pending')}\n"

    # --- NO TASK INSTRUCTIONS HERE. THE SYSTEM PROMPT HANDLES THE TASK. ---
    
    return prompt

def generate_ai_summary(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate AI summary using OpenAI"""

    prompt = format_patient_data_for_ai(patient_data)
    if not prompt.strip():
        return build_error_summary("No patient data available for summary generation")

    summary = call_openai_for_summary(prompt, temperature=0.1)

    if "error" not in summary:
        print("✅ AI Summary Generated Successfully")
    else:
        print(f"❌ Error generating AI summary: {summary['error']}")

    return summary

# ==========================================
# 📡 GDT PARSER
# ==========================================

def parse_gdt_line(line):
    line = line.strip()
    if len(line) < 7:
        return None, None
    key = line[3:7]
    value = line[7:]
    return key, value

class GDTHandler(FileSystemEventHandler):
    def __init__(self):
        super().__init__()
        self.bdt_parser = BDTParser()

    def on_modified(self, event):
        if event.src_path.endswith(WATCH_FILE):
            print(f"⚡ GDT UPDATE DETECTED")
            time.sleep(0.1)
            self.read_gdt_file(event.src_path)

    def read_gdt_file(self, filepath):
        global current_patient, ai_summary_cache

        try:
            with open(filepath, 'r', encoding='latin-1') as f:
                content = f.read()
        except Exception as read_error:
            print(f"❌ ERROR reading GDT file: {read_error}")
            return

        try:
            bdt_filename = None
            for line in content.split('\n'):
                if 'BDT_FILE:' in line:
                    parts = line.split('BDT_FILE:')
                    if len(parts) > 1:
                        candidate = parts[1].strip()
                        if candidate:
                            bdt_filename = candidate
                            break

            handled_bdt = False
            if bdt_filename:
                print(f"🔍 BDT file reference found: {bdt_filename}")
                bdt_path = (WATCH_FOLDER / bdt_filename).resolve()

                if bdt_path.exists():
                    patient_data = self.bdt_parser.parse_bdt_file(bdt_path)

                    if patient_data:
                        demo = patient_data.get('demographics', {})
                        patient_identifier = (demo.get('patient_id') or demo.get('patient_number') or "--")

                        new_patient = {
                            "id": str(patient_identifier).strip() if patient_identifier else "--",
                            "firstname": (demo.get('first_name') or 'Unknown').strip(),
                            "lastname": (demo.get('last_name') or 'Unknown').strip(),
                            "dob": (demo.get('date_of_birth') or '--'),
                            "diagnoses": [],
                            "medications": []
                        }

                        diagnoses = []
                        for dx in patient_data.get('diagnoses', []):
                            icd = (dx.get('icd_code') or '').strip()
                            text = (dx.get('diagnosis_text') or '').strip()
                            label = None
                            if icd and text:
                                label = f"{icd}: {text}"
                            elif text:
                                label = text
                            elif icd:
                                label = icd
                            if label:
                                diagnoses.append(label)
                        new_patient['diagnoses'] = diagnoses

                        medications = []
                        for med in patient_data.get('medications', []):
                            name = (med.get('name') or '').strip()
                            dosage = (med.get('dosage') or '').strip()
                            label = None
                            if name and dosage:
                                label = f"{name} - {dosage}"
                            elif name:
                                label = name
                            if label:
                                medications.append(label)
                        new_patient['medications'] = medications

                        current_patient = new_patient
                        print(f"✅ Patient: {current_patient['firstname']} {current_patient['lastname']}")

                        formatted_text = self.bdt_parser.format_for_ai(patient_data)

                        patient_db = get_patient_by_name(
                            current_patient['firstname'],
                            current_patient['lastname']
                        )

                        if patient_db:
                            print(f"🔍 Patient found in database (ID: {patient_db['id']})")
                            threading.Thread(
                                target=generate_and_cache_summary_from_bdt,
                                args=(patient_db['id'], formatted_text),
                                daemon=True
                            ).start()
                        else:
                            print(f"⚠️ Patient not found in database, using BDT data only")
                            threading.Thread(
                                target=generate_ai_summary_from_bdt_text,
                                args=(formatted_text,),
                                daemon=True
                            ).start()
                        handled_bdt = True
                    else:
                        print(f"❌ Failed to parse BDT file")
                else:
                    print(f"❌ BDT file not found: {bdt_path}")
                if handled_bdt:
                    return

            print(f"📖 Using legacy GDT parsing")

            new_data = {
                "id": "Unknown",
                "firstname": "Unknown",
                "lastname": "Unknown",
                "dob": "--",
                "diagnoses": [],
                "medications": []
            }

            for raw_line in content.split('\n'):
                key, value = parse_gdt_line(raw_line)
                if not key or value is None:
                    continue

                if key == "3000":
                    new_data["id"] = value.strip()
                elif key == "3101":
                    new_data["lastname"] = value.strip()
                elif key == "3102":
                    new_data["firstname"] = value.strip()
                elif key == "3103":
                    new_data["dob"] = value.strip()
                elif key == "6200":
                    if value.startswith("DX:"):
                        new_data["diagnoses"].append(value.strip())
                    elif value.startswith("RX:"):
                        new_data["medications"].append(value.strip())
                    else:
                        new_data["diagnoses"].append(value.strip())

            current_patient = new_data
            print(f"✅ DATA PARSED: {current_patient['firstname']} {current_patient['lastname']}")

            patient_db = get_patient_by_name(
                current_patient['firstname'],
                current_patient['lastname']
            )

            if patient_db:
                print(f"🔍 Patient found in database (ID: {patient_db['id']})")
                threading.Thread(
                    target=generate_and_cache_summary,
                    args=(patient_db['id'],),
                    daemon=True
                ).start()
            else:
                print(f"⚠️ Patient not found in database")

        except Exception as e:
            print(f"❌ ERROR: {e}")
            import traceback
            traceback.print_exc()

def generate_and_cache_summary(patient_id: int):
    """Generate AI summary and cache it"""
    global ai_summary_cache

    print(f"🤖 Generating AI summary for patient {patient_id}...")

    patient_data = get_comprehensive_patient_data(patient_id)

    if not patient_data:
        print(f"❌ Could not retrieve patient data")
        return

    summary = generate_ai_summary(patient_data)

    cache_key = str(patient_id)
    ai_summary_cache[cache_key] = {
        'summary': summary,
        'generated_at': datetime.now(),
        'patient_data': patient_data  # Include raw data for display
    }

    print(f"✅ AI summary cached for patient {patient_id}")


def generate_and_cache_summary_from_bdt(patient_id: int, bdt_formatted_text: str):
    """Generate AI summary using combined BDT and database data"""
    global ai_summary_cache

    print(f"🤖 Generating AI summary for patient {patient_id} using BDT data...")

    sections = ["=== BDT PATIENT RECORD ==="]
    base_text = (bdt_formatted_text or "").strip()
    if base_text:
        sections.append(base_text)

    patient_data = get_comprehensive_patient_data(patient_id)

    if patient_data:
        sections.append("=== ADDITIONAL DATABASE INFORMATION ===")
        sections.append(format_patient_data_for_ai(patient_data))

    combined_prompt = "\n\n".join(sections)
    summary = generate_ai_summary_from_text(combined_prompt)

    cache_key = str(patient_id)
    ai_summary_cache[cache_key] = {
        'summary': summary,
        'generated_at': datetime.now(),
        'patient_data': patient_data,
        'source': 'bdt'
    }

    if base_text:
        ai_summary_cache[cache_key]['bdt_formatted'] = base_text

    print(f"✅ AI summary cached for patient {patient_id} (BDT)")


def generate_ai_summary_from_bdt_text(bdt_formatted_text: str):
    """Generate AI summary from BDT data when database match is unavailable"""

    sections = ["=== BDT PATIENT RECORD ==="]
    base_text = (bdt_formatted_text or "").strip()
    if base_text:
        sections.append(base_text)

    combined_prompt = "\n\n".join(sections)
    summary = generate_ai_summary_from_text(combined_prompt)

    print("✅ AI summary generated from BDT-only data")
    print(summary)

    return summary


def generate_ai_summary_from_text(patient_text: str) -> Dict[str, Any]:
    """Generate AI summary from free-form patient text"""

    prompt_text = patient_text.strip() if patient_text else "No patient data provided."
    user_prompt = (
        "Analyze the following patient record and provide the structured clinical JSON summary "
        "requested by the system instructions.\n\n"
        f"{prompt_text}"
    )

    summary = call_openai_for_summary(user_prompt, temperature=0.2)

    if "error" not in summary:
        print("✅ AI Summary Generated Successfully (text input)")
        print(f"📋 Summary structure: {list(summary.keys())}")
        if 'problem_representation' in summary:
            print(f"📝 Problem Representation: {summary['problem_representation'][:100]}...")
    else:
        print(f"❌ Error generating AI summary from text: {summary['error']}")

    return summary


def start_file_watcher():
    event_handler = GDTHandler()
    observer = Observer()
    observer.schedule(event_handler, path=str(WATCH_FOLDER), recursive=False)
    observer.start()
    print("👁️ File watcher started")

# ==========================================
# 🌐 API ENDPOINTS
# ==========================================

@app.get("/api/current_patient_summary")
def get_current_patient_summary():
    """Get AI summary for current patient from BDT file"""
    global current_patient
    
    if not current_patient:
        raise HTTPException(status_code=404, detail="No patient data available. Load a patient file first.")
    
    # Check if we have cached summary for current patient
    patient_key = f"{current_patient['firstname']}_{current_patient['lastname']}"
    current_time = datetime.now()
    
    if patient_key in ai_summary_cache:
        cached = ai_summary_cache[patient_key]
        age_seconds = (current_time - cached['generated_at']).total_seconds()
        
        if age_seconds < 3600:  # 1 hour cache
            print(f"📦 Returning cached summary for {patient_key}")
            return {
                "patient": current_patient,
                "ai_summary": cached['summary'],
                "cached": True,
                "age_seconds": int(age_seconds)
            }
    
    print(f"🔄 Generating fresh AI summary for {patient_key}")
    
    # Create patient context for AI
    patient_context = f"""
Patient: {current_patient['firstname']} {current_patient['lastname']}
DOB: {current_patient['dob']}
Patient ID: {current_patient['id']}

Diagnoses:
{chr(10).join(f"- {dx}" for dx in current_patient['diagnoses'])}

Medications:
{chr(10).join(f"- {med}" for med in current_patient['medications'])}
"""

    try:
        if not ai_client:
            return {'error': 'AI service not configured'}
        
        response = ai_client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {
                    "role": "system", 
                    "content": AI_SUMMARY_SYSTEM_PROMPT
                },
                {
                    "role": "user", 
                    "content": f"Please provide an AI summary for this patient based on their current data:\\n\\n{patient_context}"
                }
            ],
            temperature=0.3,
            max_tokens=2000
        )
        
        ai_summary = response.choices[0].message.content
        
        # Cache the summary
        ai_summary_cache[patient_key] = {
            'summary': ai_summary,
            'generated_at': current_time
        }
        
        return {
            "patient": current_patient,
            "ai_summary": ai_summary,
            "cached": False,
            "generated_at": current_time.isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error generating AI summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate AI summary: {str(e)}")

@app.get("/api/current_patient")
def get_patient():
    """Get current patient from GDT"""
    return current_patient

@app.get("/api/patient/{patient_id}/summary")
def get_patient_summary(patient_id: int, force_refresh: bool = False):
    """Get comprehensive patient summary with AI analysis"""
    
    cache_key = str(patient_id)
    current_time = datetime.now()

    # Check cache first - ALWAYS return cached data if available (instant response)
    if cache_key in ai_summary_cache and not force_refresh:
        cached = ai_summary_cache[cache_key]
        generated_at = cached['generated_at']

        if isinstance(generated_at, datetime):
            delta = current_time - generated_at
            age_seconds = delta.total_seconds()
        elif isinstance(generated_at, str):
            try:
                parsed = datetime.fromisoformat(generated_at)
                delta = current_time - parsed
                age_seconds = delta.total_seconds()
                generated_at = parsed
            except (ValueError, TypeError):
                age_seconds = 0
        else:
            age_seconds = 0

        is_stale = age_seconds > 3600  # 1 hour
        
        print(f"📦 Returning cached summary for patient {patient_id} (age: {age_seconds:.0f}s)")
        return {
            "cached": True,
            "is_stale": is_stale,
            "age_seconds": int(age_seconds),
            "generated_at": generated_at.isoformat() if isinstance(generated_at, datetime) else str(generated_at),
            "ai_summary": cached['summary'],
            "patient_data": cached['patient_data']
        }
    
    # Generate new summary (only if no cache or forced refresh)
    print(f"🔄 Generating fresh summary for patient {patient_id}")
    patient_data = get_comprehensive_patient_data(patient_id)
    
    if not patient_data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    ai_summary = generate_ai_summary(patient_data)
    
    # Cache it
    ai_summary_cache[cache_key] = {
        'summary': ai_summary,
        'generated_at': current_time,
        'patient_data': patient_data
    }
    
    return {
        "cached": False,
        "is_stale": False,
        "age_seconds": 0,
        "generated_at": current_time.isoformat(),
        "ai_summary": ai_summary,
        "patient_data": patient_data
    }

@app.get("/api/patient/by_name")
def get_patient_by_name_endpoint(firstname: str, lastname: str):
    """Find patient by name"""
    patient = get_patient_by_name(firstname, lastname)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@app.get("/api/patient/{patient_id}/drug_risk_assessment")
def get_drug_risk_assessment(patient_id: int):
    """Get AI-powered drug interaction and risk assessment"""
    
    print(f"🧪 Drug risk assessment requested for patient {patient_id}")
    
    # Get comprehensive patient data
    patient_data = get_comprehensive_patient_data(patient_id)
    if not patient_data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Generate drug risk assessment
    risk_assessment = generate_drug_risk_assessment(patient_data)
    
    return {
        "patient_id": patient_id,
        "patient_name": f"{patient_data.get('firstName', '')} {patient_data.get('lastName', '')}",
        "assessment": risk_assessment,
        "generated_at": datetime.now().isoformat()
    }

@app.post("/api/patient/{patient_id}/regenerate_summary")
def regenerate_summary(patient_id: int):
    """Force regenerate AI summary"""
    
    # Clear cache first
    cache_key = str(patient_id)
    if cache_key in ai_summary_cache:
        del ai_summary_cache[cache_key]
        print(f"🗑️ Cleared cache for patient {patient_id}")
    
    patient_data = get_comprehensive_patient_data(patient_id)
    if not patient_data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    ai_summary = generate_ai_summary(patient_data)
    
    ai_summary_cache[cache_key] = {
        'summary': ai_summary,
        'generated_at': datetime.now(),
        'patient_data': patient_data
    }
    
    return {
        "status": "success",
        "generated_at": datetime.now().isoformat(),
        "ai_summary": ai_summary
    }

@app.delete("/api/cache/clear")
def clear_all_cache():
    """Clear all cached AI summaries"""
    global ai_summary_cache
    count = len(ai_summary_cache)
    ai_summary_cache.clear()
    print(f"🗑️ Cleared {count} cached summaries")
    return {"status": "success", "cleared": count}

# ==========================================
# 🎬 PATIENT SIMULATOR
# ==========================================

class PatientSimulatorData(BaseModel):
    id: str
    firstname: str
    lastname: str
    dob: str
    diagnoses: List[str] = Field(default_factory=list)
    medications: List[str] = Field(default_factory=list)

class VisitReasonData(BaseModel):
    primary_reason: str
    visit_type: str
    priority_level: str
    detailed_reason: str
    referring_doctor: Optional[str] = None
    insurance_auth: str
    timestamp: str
    patient_id: int

@app.post("/simulate/open_patient")
def simulate_patient_open(data: PatientSimulatorData):
    """Simulate opening a patient in the EHR (writes GDT file)"""
    print(f"📂 Simulator requested: {data.firstname} {data.lastname}")
    
    lines = []
    lines.append(f"01380006302")
    lines.append(f"0093000{data.id}")
    lines.append(f"0{len(data.lastname)+7}3101{data.lastname}")
    lines.append(f"0{len(data.firstname)+7}3102{data.firstname}")
    lines.append(f"0{len(data.dob)+7}3103{data.dob}")
    
    for diag in data.diagnoses:
        text = f"DX: {diag}"
        lines.append(f"{len(text)+7:03d}6200{text}")
    
    for med in data.medications:
        text = f"RX: {med}"
        lines.append(f"{len(text)+7:03d}6200{text}")

    try:
        with open(FULL_PATH, 'w', encoding='latin-1') as f:
            f.write("\n".join(lines))
        return {"status": "success"}
    except Exception as e:
        print(f"❌ Error writing GDT file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/patient/{patient_id}/visit_reason")
def save_visit_reason(patient_id: int, visit_reason: VisitReasonData):
    """Save visit reason for a patient and trigger AI analysis"""
    try:
        # Store visit reason in a temporary cache for AI processing
        visit_reason_cache[patient_id] = visit_reason.dict()
        
        print(f"📝 Visit reason saved for patient {patient_id}: {visit_reason.primary_reason}")
        
        # Regenerate AI summary with visit reason context
        patient_data = get_comprehensive_patient_data(patient_id)
        if patient_data:
            # Add visit reason to patient data
            patient_data['visit_reason'] = visit_reason.dict()
            ai_summary = generate_ai_summary(patient_data)
            
            # Cache the updated summary
            ai_summary_cache[patient_id] = {
                'summary': ai_summary,
                'generated_at': datetime.now(),
                'patient_data': patient_data
            }
            
            return {"status": "success", "message": "Visit reason saved and AI summary updated"}
        else:
            return {"status": "error", "message": "Patient not found"}
            
    except Exception as e:
        print(f"❌ Error saving visit reason: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        return {"status": "error", "message": str(e)}

# ==========================================
# 🏥 MEDATIXX API ENDPOINTS (German Medical Practice Data)
# ==========================================

@app.get("/api/medatixx/categories")
def get_medatixx_categories(search: str = "", limit: int = 10):
    """Search medical categories in medatixx database"""
    try:
        if search:
            results = search_medatixx_categories(search, limit)
        else:
            # Get all categories if no search term
            connection = get_medatixx_connection()
            if not connection:
                raise HTTPException(status_code=503, detail="Database connection failed")
            
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT Kategorie, KategorieLangtext, COUNT(*) as count
                FROM feldbeschreibungen 
                GROUP BY Kategorie, KategorieLangtext
                ORDER BY count DESC, Kategorie
                LIMIT %s
            """, (limit,))
            results = cursor.fetchall()
            cursor.close()
            connection.close()
        
        return {"status": "success", "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching categories: {str(e)}")

@app.get("/api/medatixx/forms")
def get_medatixx_forms(category: str = None, search: str = "", limit: int = 20):
    """Get medical form templates from medatixx database"""
    try:
        if search:
            results = search_medatixx_forms(search, limit)
        else:
            results = get_medatixx_form_templates(category, limit)
        
        return {"status": "success", "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching forms: {str(e)}")

@app.get("/api/medatixx/search")
def search_medatixx(q: str, limit: int = 10):
    """Search across all medatixx data"""
    try:
        results = search_medatixx_forms(q, limit)
        return {"status": "success", "query": q, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching medatixx: {str(e)}")

@app.get("/api/medatixx/stats")
def get_medatixx_stats():
    """Get statistics about medatixx database"""
    try:
        stats = get_medatixx_statistics()
        return {"status": "success", "data": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")

@app.get("/api/medatixx/form/{form_number}")
def get_medatixx_form_detail(form_number: int):
    """Get detailed information about a specific form"""
    try:
        connection = get_medatixx_connection()
        if not connection:
            raise HTTPException(status_code=503, detail="Database connection failed")
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT * FROM feldbeschreibungen WHERE Nummer = %s
        """, (form_number,))
        result = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not result:
            raise HTTPException(status_code=404, detail="Form not found")
        
        return {"status": "success", "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching form detail: {str(e)}")

# ==========================================
# 🚀 STARTUP SEQUENCE
# ==========================================

def start_server():
    """Run the API server"""
    uvicorn.run(app, host="0.0.0.0", port=8001)

if __name__ == "__main__":
    print("=" * 60)
    print("🏥 AI-Enhanced EHR Backend Starting...")
    print("=" * 60)
    
    # Test database connection
    print("\n📊 Testing database connection...")
    conn = get_db_connection()
    if conn:
        print("✅ Database connected successfully")
        conn.close()
    else:
        print("⚠️  Database connection failed - check your .env file")
    
    # Test medatixx database connection
    print("\n🏥 Testing medatixx database connection...")
    medatixx_conn = get_medatixx_connection()
    if medatixx_conn:
        cursor = medatixx_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM feldbeschreibungen")
        count = cursor.fetchone()[0]
        print(f"✅ Medatixx database connected successfully ({count} records)")
        cursor.close()
        medatixx_conn.close()
    else:
        print("⚠️  Medatixx database connection failed - forms library unavailable")
    
    # Test AI client
    if ai_client:
        provider_name = f"Microsoft Foundry {AI_MODEL}"
        print(f"✅ AI configured: {provider_name}")
    else:
        print("⚠️  AI API key not found - AI summaries will be disabled")
    
    print("\n🎯 Starting services...")
    
    # 1. Start the File Watcher
    t_watcher = threading.Thread(target=start_file_watcher, daemon=True)
    t_watcher.start()
    print("✅ GDT File Watcher: Active")
    
    # 2. Start the API Server
    t_server = threading.Thread(target=start_server, daemon=True)
    t_server.start()
    print("✅ API Server: Running on http://127.0.0.1:8000")
    
    # 3. Start the Desktop Window
    print("\n🖥️  Launching AI Sidecar Window...")
    try:
        sidecar_path = Path(HTML_FILE_PATH).resolve()
        if not sidecar_path.exists():
            raise FileNotFoundError(f"Sidecar HTML not found at {sidecar_path}")

        webview.create_window(
            'AI Patient Sidecar',
            url=sidecar_path.as_uri(),
            width=450,
            height=900,
            resizable=True,
            on_top=True
        )
        webview.start()
    except FileNotFoundError as missing_html:
        print(f"❌ {missing_html}")
        print("💡 Update HTML_FILE_PATH or ensure the sidecar HTML file exists.")
        while True:
            time.sleep(1)
    except Exception as e:
        print(f"❌ Desktop window error: {e}")
        print("💡 Make sure pywebview is installed: pip install pywebview")
        # Keep server running even if window fails
        while True:
            time.sleep(1)