#!/usr/bin/env python3
"""
Setup German Patient Database with GDT Integration
Creates a dedicated MySQL database for German patient data and sets up GDT file processing.
"""

import mysql.connector
from mysql.connector import Error
import pandas as pd
import logging
import os
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def create_german_database():
    """Create dedicated German patient database"""
    try:
        # Connect to MySQL server (without database)
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password=''  # XAMPP default
        )
        
        cursor = connection.cursor()
        
        # Create database
        cursor.execute("CREATE DATABASE IF NOT EXISTS german_ehr_system")
        cursor.execute("USE german_ehr_system")
        
        logging.info("Created/Connected to german_ehr_system database")
        
        # Create comprehensive German patient tables
        create_tables_sql = [
            """
            CREATE TABLE IF NOT EXISTS patients_master (
                patient_id INT AUTO_INCREMENT PRIMARY KEY,
                patient_number VARCHAR(20) UNIQUE NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                date_of_birth DATE,
                gender VARCHAR(10),
                insurance_number VARCHAR(50),
                insurance_provider VARCHAR(200),
                address TEXT,
                phone VARCHAR(20),
                email VARCHAR(100),
                first_visit_date DATETIME,
                last_visit_date DATETIME,
                total_visits INT DEFAULT 0,
                active_status BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS medical_records (
                record_id INT AUTO_INCREMENT PRIMARY KEY,
                patient_number VARCHAR(20) NOT NULL,
                visit_date DATETIME,
                record_type VARCHAR(50),
                category VARCHAR(50),
                icd_code VARCHAR(20),
                diagnosis_text TEXT,
                treatment_text TEXT,
                medication TEXT,
                notes TEXT,
                provider_name VARCHAR(100),
                department VARCHAR(100),
                severity_level VARCHAR(20),
                follow_up_required BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_patient_number (patient_number),
                INDEX idx_visit_date (visit_date),
                INDEX idx_icd_code (icd_code)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdt_files (
                gdt_id INT AUTO_INCREMENT PRIMARY KEY,
                patient_number VARCHAR(20),
                filename VARCHAR(255),
                file_path TEXT,
                file_size INT,
                processed_date DATETIME,
                processing_status VARCHAR(50) DEFAULT 'pending',
                error_message TEXT,
                summary_generated BOOLEAN DEFAULT FALSE,
                ai_summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_patient_number (patient_number),
                INDEX idx_processing_status (processing_status)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS diagnosis_codes (
                code_id INT AUTO_INCREMENT PRIMARY KEY,
                icd_code VARCHAR(20) UNIQUE,
                description_german TEXT,
                description_english TEXT,
                category VARCHAR(100),
                severity VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS ai_summaries (
                summary_id INT AUTO_INCREMENT PRIMARY KEY,
                patient_number VARCHAR(20),
                summary_type VARCHAR(50),
                summary_text TEXT,
                key_findings JSON,
                recommendations JSON,
                risk_factors JSON,
                generated_at DATETIME,
                model_version VARCHAR(50),
                confidence_score DECIMAL(3,2),
                reviewed_by_doctor BOOLEAN DEFAULT FALSE,
                INDEX idx_patient_number (patient_number),
                INDEX idx_summary_type (summary_type)
            )
            """
        ]
        
        for sql in create_tables_sql:
            cursor.execute(sql)
            
        # Insert common German ICD codes
        insert_icd_codes = """
        INSERT IGNORE INTO diagnosis_codes (icd_code, description_german, description_english, category, severity) VALUES
        ('R52.0', 'Akute Schmerzen', 'Acute pain', 'Symptoms', 'Moderate'),
        ('R51', 'Kopfschmerz', 'Headache', 'Symptoms', 'Mild'),
        ('R12', 'Sodbrennen', 'Heartburn', 'Digestive', 'Mild'),
        ('R05', 'Husten', 'Cough', 'Respiratory', 'Mild'),
        ('R11', 'Übelkeit und Erbrechen', 'Nausea and vomiting', 'Digestive', 'Moderate'),
        ('L08', 'Sonstige lokale Infektionen der Haut', 'Other local infections of skin', 'Skin', 'Moderate'),
        ('M54.5', 'Kreuzschmerz', 'Low back pain', 'Musculoskeletal', 'Moderate'),
        ('B00', 'Infektionen durch Herpes-simplex-Viren', 'Herpes simplex infections', 'Infectious', 'Mild'),
        ('S82.1', 'Fraktur des proximalen Endes der Tibia', 'Fracture of upper end of tibia', 'Injury', 'Severe'),
        ('J06.9', 'Akute Infektion der oberen Atemwege', 'Acute upper respiratory infection', 'Respiratory', 'Mild')
        """
        cursor.execute(insert_icd_codes)
        
        connection.commit()
        logging.info("Created all German patient database tables")
        
        return connection
        
    except Error as e:
        logging.error(f"Error creating German database: {e}")
        return None

def migrate_existing_data(connection):
    """Migrate data from ehr_app database to german_ehr_system"""
    cursor = connection.cursor()
    
    try:
        # Get data from original database
        source_connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='',
            database='ehr_app'
        )
        source_cursor = source_connection.cursor()
        
        # Get German patients
        source_cursor.execute("SELECT * FROM german_patients")
        patients = source_cursor.fetchall()
        
        # Get patient records
        source_cursor.execute("SELECT * FROM patient_records")
        records = source_cursor.fetchall()
        
        logging.info(f"Found {len(patients)} patients and {len(records)} records to migrate")
        
        # Migrate patients to new structure
        for patient in patients:
            insert_patient = """
            INSERT INTO patients_master 
            (patient_number, first_visit_date, last_visit_date, total_visits, insurance_provider)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            last_visit_date = VALUES(last_visit_date),
            total_visits = VALUES(total_visits)
            """
            cursor.execute(insert_patient, (
                str(patient[1]),  # patient_number
                patient[2],       # first_encounter_date
                patient[3],       # last_encounter_date
                patient[4],       # total_records
                patient[6] if patient[6] else 'Unknown'  # insurance_info
            ))
        
        # Migrate records
        for record in records:
            insert_record = """
            INSERT INTO medical_records 
            (patient_number, visit_date, record_type, category, icd_code, diagnosis_text, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(insert_record, (
                str(record[2]),   # patient_number
                record[4],        # encounter_date
                record[3],        # record_type
                record[5],        # category
                record[6],        # icd_code
                record[7],        # description
                record[8][:1000] if record[8] else None  # raw_data (truncated)
            ))
        
        connection.commit()
        logging.info("Successfully migrated existing data to German database")
        
        source_connection.close()
        
    except Error as e:
        logging.error(f"Error migrating data: {e}")
        connection.rollback()

def setup_gdt_processing():
    """Setup GDT file processing directories"""
    gdt_dirs = [
        "C:\\gdt_exchange\\incoming",
        "C:\\gdt_exchange\\processed",
        "C:\\gdt_exchange\\archive",
        "C:\\gdt_exchange\\errors"
    ]
    
    for directory in gdt_dirs:
        os.makedirs(directory, exist_ok=True)
        logging.info(f"Created directory: {directory}")
    
    # Create sample GDT file for testing
    sample_gdt = """8000000005013.1.0
8100000000002.2.0
8200000000006101
31000000000920241205
32000000000920241205
330000000003101
8210000000013121
8220000000008MUSTERMANN
8230000000004MAX
8240000000010010119801
825000000000129
8310000000019MUSTER KRANKENHAUS
8320000000015INNERE MEDIZIN
6200000000002R51
6201000000011Kopfschmerz
6220000000034Chronische Kopfschmerzen, Anamnese
8480000000002N
9100000000002101"""
    
    sample_file_path = "C:\\gdt_exchange\\incoming\\patient_001_20241205.gdt"
    with open(sample_file_path, 'w', encoding='iso-8859-1') as f:
        f.write(sample_gdt)
    
    logging.info(f"Created sample GDT file: {sample_file_path}")
    
    return gdt_dirs

def main():
    """Main function to setup German patient database"""
    logging.info("Setting up German Patient Database with GDT Integration")
    
    # Create database and tables
    connection = create_german_database()
    if not connection:
        logging.error("Failed to create database. Exiting.")
        return
    
    try:
        # Migrate existing data
        migrate_existing_data(connection)
        
        # Setup GDT processing
        gdt_dirs = setup_gdt_processing()
        
        # Generate summary report
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM patients_master")
        patient_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM medical_records")
        record_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM diagnosis_codes")
        icd_count = cursor.fetchone()[0]
        
        logging.info("=" * 50)
        logging.info("GERMAN PATIENT DATABASE SETUP COMPLETE")
        logging.info("=" * 50)
        logging.info(f"Database: german_ehr_system")
        logging.info(f"Patients: {patient_count}")
        logging.info(f"Medical Records: {record_count}")
        logging.info(f"ICD Codes: {icd_count}")
        logging.info(f"GDT Processing Directories: {len(gdt_dirs)}")
        logging.info("Sample GDT file created for testing")
        
        logging.info("\nNext steps:")
        logging.info("1. Start the GDT file watcher service")
        logging.info("2. Configure AI backend to read from german_ehr_system database")
        logging.info("3. Test GDT file processing with sample data")
        
    except Exception as e:
        logging.error(f"Setup error: {e}")
    
    finally:
        if connection.is_connected():
            connection.close()
            logging.info("Database connection closed")

if __name__ == "__main__":
    main()