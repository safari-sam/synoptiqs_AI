#!/usr/bin/env python3
"""
AI Backend Service for German Patient Data
Reads from german_ehr_system database and provides AI summarization
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from mysql.connector import Error
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging
import json

# Setup logging
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="German EHR AI Backend", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'german_ehr_system',
    'user': 'root',
    'password': ''  # XAMPP default
}

# Pydantic models
class PatientSummary(BaseModel):
    patient_number: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    total_visits: int
    active_diagnoses: List[str]
    recent_records: List[Dict]
    risk_assessment: str
    ai_summary: str

class MedicalRecord(BaseModel):
    record_id: int
    patient_number: str
    visit_date: str
    record_type: str
    category: str
    icd_code: Optional[str] = None
    diagnosis_text: Optional[str] = None
    notes: Optional[str] = None
    provider_name: Optional[str] = None

class GDTFileInfo(BaseModel):
    file_id: int
    patient_number: str
    filename: str
    processed_date: str
    processing_status: str

def get_db_connection():
    """Get database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        logging.error(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

def calculate_age(birth_date: str) -> Optional[int]:
    """Calculate age from birth date"""
    try:
        if birth_date:
            birth = datetime.strptime(birth_date, '%Y-%m-%d')
            today = datetime.now()
            age = today.year - birth.year
            if today.month < birth.month or (today.month == birth.month and today.day < birth.day):
                age -= 1
            return age
    except:
        return None

def generate_ai_summary(patient_data: Dict) -> str:
    """Generate AI summary for patient data"""
    try:
        # Extract key information
        name = patient_data.get('name', 'Unknown')
        age = patient_data.get('age', 'Unknown')
        gender = patient_data.get('gender', 'Unknown')
        total_visits = patient_data.get('total_visits', 0)
        diagnoses = patient_data.get('active_diagnoses', [])
        recent_records = patient_data.get('recent_records', [])
        
        # Build summary
        summary_parts = []
        
        # Patient overview
        summary_parts.append(f"Patient {name} ({age} years old, {gender}) has {total_visits} recorded visits.")
        
        # Diagnoses analysis
        if diagnoses:
            unique_diagnoses = list(set(diagnoses))
            if len(unique_diagnoses) == 1:
                summary_parts.append(f"Primary diagnosis: {unique_diagnoses[0]}.")
            elif len(unique_diagnoses) <= 3:
                summary_parts.append(f"Key diagnoses include: {', '.join(unique_diagnoses)}.")
            else:
                summary_parts.append(f"Complex case with {len(unique_diagnoses)} different diagnoses including {', '.join(unique_diagnoses[:3])}...")
        
        # Recent activity
        if recent_records:
            recent_count = len(recent_records)
            latest_date = max([r.get('visit_date', '1900-01-01') for r in recent_records])
            summary_parts.append(f"Most recent activity: {recent_count} records, last visit {latest_date}.")
            
            # Find patterns
            recent_categories = [r.get('category', '') for r in recent_records]
            category_counts = {}
            for cat in recent_categories:
                if cat:
                    category_counts[cat] = category_counts.get(cat, 0) + 1
            
            if category_counts:
                main_category = max(category_counts, key=category_counts.get)
                summary_parts.append(f"Recent focus on {main_category} care.")
        
        # Risk assessment
        risk_factors = []
        if len(diagnoses) > 5:
            risk_factors.append("multiple comorbidities")
        if total_visits > 10:
            risk_factors.append("frequent healthcare utilization")
        if any('chronic' in str(d).lower() for d in diagnoses):
            risk_factors.append("chronic conditions")
        
        if risk_factors:
            summary_parts.append(f"Risk considerations: {', '.join(risk_factors)}.")
        
        return " ".join(summary_parts)
        
    except Exception as e:
        logging.error(f"AI summary generation error: {e}")
        return f"Patient summary for {patient_data.get('name', 'Unknown')} - {len(patient_data.get('recent_records', []))} records reviewed."

def assess_patient_risk(patient_data: Dict) -> str:
    """Assess patient risk level"""
    try:
        score = 0
        
        # Age factor
        age = patient_data.get('age', 0)
        if age > 65:
            score += 2
        elif age > 45:
            score += 1
        
        # Visit frequency
        visits = patient_data.get('total_visits', 0)
        if visits > 15:
            score += 2
        elif visits > 8:
            score += 1
        
        # Diagnosis complexity
        diagnoses = patient_data.get('active_diagnoses', [])
        unique_diagnoses = len(set(diagnoses))
        if unique_diagnoses > 5:
            score += 3
        elif unique_diagnoses > 2:
            score += 1
        
        # Recent activity
        recent_records = patient_data.get('recent_records', [])
        recent_30_days = [r for r in recent_records 
                         if datetime.strptime(r.get('visit_date', '1900-01-01'), '%Y-%m-%d') > 
                         datetime.now() - timedelta(days=30)]
        if len(recent_30_days) > 3:
            score += 2
        elif len(recent_30_days) > 1:
            score += 1
        
        # Determine risk level
        if score >= 6:
            return "HIGH - Requires immediate attention and care coordination"
        elif score >= 3:
            return "MEDIUM - Regular monitoring recommended"
        else:
            return "LOW - Standard follow-up appropriate"
            
    except Exception as e:
        logging.error(f"Risk assessment error: {e}")
        return "UNKNOWN - Unable to assess risk level"

@app.get("/")
async def root():
    """API root endpoint"""
    return {"message": "German EHR AI Backend Service", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM patients_master")
        patient_count = cursor.fetchone()[0]
        cursor.close()
        connection.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "total_patients": patient_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {e}")

@app.get("/patients", response_model=List[Dict])
async def get_all_patients():
    """Get all German patients"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT patient_number, first_name, last_name, date_of_birth, gender, 
                   last_visit_date, total_visits, creation_date
            FROM patients_master 
            ORDER BY last_visit_date DESC
        """)
        
        patients = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return patients
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patients: {e}")

@app.get("/patient/{patient_number}/summary", response_model=PatientSummary)
async def get_patient_summary(patient_number: str):
    """Get AI-enhanced patient summary"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get patient basic info
        cursor.execute("""
            SELECT patient_number, first_name, last_name, date_of_birth, gender, 
                   last_visit_date, total_visits
            FROM patients_master 
            WHERE patient_number = %s
        """, (patient_number,))
        
        patient = cursor.fetchone()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get recent medical records
        cursor.execute("""
            SELECT record_id, visit_date, record_type, category, icd_code, 
                   diagnosis_text, notes, provider_name
            FROM medical_records 
            WHERE patient_number = %s 
            ORDER BY visit_date DESC 
            LIMIT 10
        """, (patient_number,))
        
        recent_records = cursor.fetchall()
        
        # Get all diagnoses
        cursor.execute("""
            SELECT DISTINCT diagnosis_text
            FROM medical_records 
            WHERE patient_number = %s AND diagnosis_text IS NOT NULL
        """, (patient_number,))
        
        diagnoses = [row['diagnosis_text'] for row in cursor.fetchall()]
        
        cursor.close()
        connection.close()
        
        # Prepare patient data for AI analysis
        patient_data = {
            'name': f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip(),
            'age': calculate_age(patient.get('date_of_birth')),
            'gender': patient.get('gender'),
            'total_visits': patient.get('total_visits', 0),
            'active_diagnoses': diagnoses,
            'recent_records': recent_records
        }
        
        # Generate AI summary and risk assessment
        ai_summary = generate_ai_summary(patient_data)
        risk_assessment = assess_patient_risk(patient_data)
        
        return PatientSummary(
            patient_number=patient_number,
            name=patient_data['name'],
            age=patient_data['age'],
            gender=patient_data['gender'],
            total_visits=patient_data['total_visits'],
            active_diagnoses=diagnoses,
            recent_records=recent_records,
            risk_assessment=risk_assessment,
            ai_summary=ai_summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating patient summary: {e}")

@app.get("/patient/{patient_number}/records", response_model=List[MedicalRecord])
async def get_patient_records(patient_number: str, limit: int = 20):
    """Get patient medical records"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT record_id, patient_number, visit_date, record_type, category, 
                   icd_code, diagnosis_text, notes, provider_name
            FROM medical_records 
            WHERE patient_number = %s 
            ORDER BY visit_date DESC, record_id DESC
            LIMIT %s
        """, (patient_number, limit))
        
        records = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return records
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patient records: {e}")

@app.get("/gdt/files", response_model=List[GDTFileInfo])
async def get_gdt_files(limit: int = 50):
    """Get processed GDT files"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT file_id, patient_number, filename, processed_date, processing_status
            FROM gdt_files 
            ORDER BY processed_date DESC 
            LIMIT %s
        """, (limit,))
        
        files = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return files
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching GDT files: {e}")

@app.get("/analytics/summary")
async def get_analytics_summary():
    """Get German EHR system analytics"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Total patients
        cursor.execute("SELECT COUNT(*) as total_patients FROM patients_master")
        total_patients = cursor.fetchone()['total_patients']
        
        # Total records
        cursor.execute("SELECT COUNT(*) as total_records FROM medical_records")
        total_records = cursor.fetchone()['total_records']
        
        # Recent activity (last 30 days)
        cursor.execute("""
            SELECT COUNT(*) as recent_records 
            FROM medical_records 
            WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        """)
        recent_records = cursor.fetchone()['recent_records']
        
        # GDT file processing
        cursor.execute("SELECT COUNT(*) as processed_files FROM gdt_files")
        processed_files = cursor.fetchone()['processed_files']
        
        # Top diagnoses
        cursor.execute("""
            SELECT diagnosis_text, COUNT(*) as count 
            FROM medical_records 
            WHERE diagnosis_text IS NOT NULL 
            GROUP BY diagnosis_text 
            ORDER BY count DESC 
            LIMIT 5
        """)
        top_diagnoses = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return {
            "total_patients": total_patients,
            "total_records": total_records,
            "recent_records": recent_records,
            "processed_gdt_files": processed_files,
            "top_diagnoses": top_diagnoses,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analytics: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)