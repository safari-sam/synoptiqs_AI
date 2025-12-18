#!/usr/bin/env python3
"""
Import German Patient Data from hack1.csv to EHR Database
This script processes real German medical practice data and imports it into the EHR system.
"""

import pandas as pd
import mysql.connector
from mysql.connector import Error
import re
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def connect_to_database():
    """Connect to MySQL database"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='ehr_app',
            user='root',
            password=''  # XAMPP default
        )
        if connection.is_connected():
            logging.info("Successfully connected to MySQL database")
            return connection
    except Error as e:
        logging.error(f"Error connecting to MySQL: {e}")
        return None

def analyze_csv_structure():
    """Analyze the CSV file structure and data types"""
    logging.info("Analyzing CSV structure...")
    
    # Try different encodings for German text
    encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
    
    for encoding in encodings:
        try:
            # Read the first few lines to understand the format
            with open('hack1.csv', 'r', encoding=encoding) as f:
                lines = f.readlines()[:10]
                logging.info(f"Successfully read with {encoding} encoding")
                for i, line in enumerate(lines[:3]):
                    print(f"Line {i+1}: {line.strip()[:100]}...")
                
                # Try to read the full CSV
                df = pd.read_csv('hack1.csv', delimiter='|', encoding=encoding, on_bad_lines='skip')
                logging.info(f"Successfully read CSV with {len(df)} rows and {len(df.columns)} columns using {encoding}")
                
                # Show column names
                logging.info(f"Columns: {list(df.columns)}")
                
                return df
                
        except Exception as e:
            logging.warning(f"Failed with {encoding}: {e}")
            continue
    
    logging.error("Could not read CSV with any encoding")
    return None

def clean_and_parse_data(df):
    """Clean and parse the patient data"""
    logging.info("Cleaning and parsing patient data...")
    
    # The first column seems to contain the actual data
    # Let's try to parse the first column which contains tab-separated values
    first_col = df.iloc[:, 0]
    
    parsed_data = []
    for idx, row in enumerate(first_col):
        if pd.isna(row):
            continue
            
        # Split by tabs
        fields = str(row).split('\t')
        
        if len(fields) >= 6:  # Ensure we have minimum required fields
            try:
                record = {
                    'record_id': fields[0] if fields[0].isdigit() else None,
                    'patient_number': fields[1] if len(fields) > 1 and fields[1].isdigit() else None,
                    'record_type': fields[2] if len(fields) > 2 else None,
                    'date': fields[3] if len(fields) > 3 else None,
                    'category': fields[4] if len(fields) > 4 else None,
                    'description': fields[5] if len(fields) > 5 else None,
                    'raw_data': str(row)  # Keep original for reference
                }
                
                # Parse date
                if record['date']:
                    try:
                        parsed_date = datetime.strptime(record['date'], '%Y-%m-%d %H:%M:%S')
                        record['parsed_date'] = parsed_date
                    except:
                        record['parsed_date'] = None
                
                # Extract ICD codes and diagnoses from description
                if record['description']:
                    # Look for ICD codes in format like "R52.0"
                    icd_match = re.search(r'[A-Z]\d{2}(?:\.\d)?', record['description'])
                    if icd_match:
                        record['icd_code'] = icd_match.group()
                
                parsed_data.append(record)
                
            except Exception as e:
                logging.warning(f"Error parsing row {idx}: {e}")
                continue
    
    logging.info(f"Successfully parsed {len(parsed_data)} records")
    return parsed_data

def create_patient_tables(connection):
    """Create tables for German patient data"""
    cursor = connection.cursor()
    
    # Drop existing tables if they exist
    drop_tables = [
        "DROP TABLE IF EXISTS patient_records",
        "DROP TABLE IF EXISTS german_patients"
    ]
    
    for drop_sql in drop_tables:
        cursor.execute(drop_sql)
        logging.info(f"Executed: {drop_sql}")
    
    # Create German patients master table
    create_patients_table = """
    CREATE TABLE german_patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_number INT UNIQUE NOT NULL,
        first_encounter_date DATETIME,
        last_encounter_date DATETIME,
        total_records INT DEFAULT 0,
        primary_diagnoses TEXT,
        insurance_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
    
    # Create patient records table (all individual records)
    create_records_table = """
    CREATE TABLE patient_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        record_id INT,
        patient_number INT NOT NULL,
        record_type VARCHAR(20),
        encounter_date DATETIME,
        category VARCHAR(50),
        description TEXT,
        icd_code VARCHAR(20),
        raw_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_number) REFERENCES german_patients(patient_number)
    )
    """
    
    try:
        cursor.execute(create_patients_table)
        logging.info("Created german_patients table")
        
        cursor.execute(create_records_table)
        logging.info("Created patient_records table")
        
        connection.commit()
        
    except Error as e:
        logging.error(f"Error creating tables: {e}")
        connection.rollback()
    
    finally:
        cursor.close()

def import_patient_data(connection, parsed_data):
    """Import parsed patient data into database"""
    cursor = connection.cursor()
    
    # Group data by patient number
    patients = {}
    
    for record in parsed_data:
        patient_num = record.get('patient_number')
        if not patient_num:
            continue
            
        if patient_num not in patients:
            patients[patient_num] = {
                'records': [],
                'diagnoses': set(),
                'insurance': set(),
                'first_date': None,
                'last_date': None
            }
        
        patients[patient_num]['records'].append(record)
        
        # Track dates
        if record.get('parsed_date'):
            date = record['parsed_date']
            if not patients[patient_num]['first_date'] or date < patients[patient_num]['first_date']:
                patients[patient_num]['first_date'] = date
            if not patients[patient_num]['last_date'] or date > patients[patient_num]['last_date']:
                patients[patient_num]['last_date'] = date
        
        # Track diagnoses
        if record.get('icd_code'):
            patients[patient_num]['diagnoses'].add(record['icd_code'])
        
        # Track insurance info
        if record.get('description') and any(x in record['description'] for x in ['Krankenkasse', 'IKK', 'DAK', 'BARMER', 'Techniker']):
            patients[patient_num]['insurance'].add(record['description'])
    
    logging.info(f"Processing {len(patients)} unique patients")
    
    # Insert patients
    insert_patient_sql = """
    INSERT INTO german_patients 
    (patient_number, first_encounter_date, last_encounter_date, total_records, primary_diagnoses, insurance_info)
    VALUES (%s, %s, %s, %s, %s, %s)
    """
    
    # Insert records
    insert_record_sql = """
    INSERT INTO patient_records 
    (record_id, patient_number, record_type, encounter_date, category, description, icd_code, raw_data)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    try:
        # Insert patients first
        for patient_num, patient_data in patients.items():
            patient_values = (
                patient_num,
                patient_data['first_date'],
                patient_data['last_date'],
                len(patient_data['records']),
                ', '.join(list(patient_data['diagnoses'])[:5]),  # First 5 diagnoses
                '; '.join(list(patient_data['insurance'])[:3])[:500]  # First 3 insurance entries, truncated
            )
            cursor.execute(insert_patient_sql, patient_values)
        
        logging.info(f"Inserted {len(patients)} patients")
        
        # Insert all records
        record_count = 0
        for patient_num, patient_data in patients.items():
            for record in patient_data['records']:
                record_values = (
                    record.get('record_id'),
                    patient_num,
                    record.get('record_type'),
                    record.get('parsed_date'),
                    record.get('category'),
                    record.get('description', '')[:1000],  # Truncate long descriptions
                    record.get('icd_code'),
                    record.get('raw_data', '')[:2000]  # Truncate raw data
                )
                cursor.execute(insert_record_sql, record_values)
                record_count += 1
        
        connection.commit()
        logging.info(f"Successfully imported {record_count} patient records for {len(patients)} patients")
        
        return len(patients), record_count
        
    except Error as e:
        logging.error(f"Error importing data: {e}")
        connection.rollback()
        return 0, 0
    
    finally:
        cursor.close()

def generate_summary_report(connection):
    """Generate summary report of imported data"""
    cursor = connection.cursor()
    
    try:
        # Get patient count
        cursor.execute("SELECT COUNT(*) FROM german_patients")
        patient_count = cursor.fetchone()[0]
        
        # Get record count
        cursor.execute("SELECT COUNT(*) FROM patient_records")
        record_count = cursor.fetchone()[0]
        
        # Get date range
        cursor.execute("SELECT MIN(first_encounter_date), MAX(last_encounter_date) FROM german_patients")
        date_range = cursor.fetchone()
        
        # Get top diagnoses
        cursor.execute("""
        SELECT icd_code, COUNT(*) as count 
        FROM patient_records 
        WHERE icd_code IS NOT NULL 
        GROUP BY icd_code 
        ORDER BY count DESC 
        LIMIT 10
        """)
        top_diagnoses = cursor.fetchall()
        
        # Get categories
        cursor.execute("""
        SELECT category, COUNT(*) as count 
        FROM patient_records 
        WHERE category IS NOT NULL 
        GROUP BY category 
        ORDER BY count DESC 
        LIMIT 10
        """)
        top_categories = cursor.fetchall()
        
        logging.info("=" * 50)
        logging.info("GERMAN PATIENT DATA IMPORT SUMMARY")
        logging.info("=" * 50)
        logging.info(f"Total Patients: {patient_count}")
        logging.info(f"Total Records: {record_count}")
        logging.info(f"Date Range: {date_range[0]} to {date_range[1]}")
        
        logging.info("\nTop 10 Diagnoses (ICD Codes):")
        for icd, count in top_diagnoses:
            logging.info(f"  {icd}: {count} records")
        
        logging.info("\nTop 10 Record Categories:")
        for category, count in top_categories:
            logging.info(f"  {category}: {count} records")
        
        return {
            'patient_count': patient_count,
            'record_count': record_count,
            'date_range': date_range,
            'top_diagnoses': top_diagnoses,
            'top_categories': top_categories
        }
        
    except Error as e:
        logging.error(f"Error generating report: {e}")
        return None
    
    finally:
        cursor.close()

def main():
    """Main function to import German patient data"""
    logging.info("Starting German Patient Data Import")
    
    # Connect to database
    connection = connect_to_database()
    if not connection:
        logging.error("Could not connect to database. Exiting.")
        return
    
    try:
        # Analyze CSV structure
        df = analyze_csv_structure()
        if df is None:
            logging.error("Could not analyze CSV structure. Exiting.")
            return
        
        # Clean and parse data
        parsed_data = clean_and_parse_data(df)
        if not parsed_data:
            logging.error("No data could be parsed. Exiting.")
            return
        
        # Create tables
        create_patient_tables(connection)
        
        # Import data
        patient_count, record_count = import_patient_data(connection, parsed_data)
        
        if patient_count > 0:
            # Generate summary report
            report = generate_summary_report(connection)
            logging.info("Import completed successfully!")
        else:
            logging.error("Import failed - no patients were imported")
    
    except Exception as e:
        logging.error(f"Unexpected error during import: {e}")
    
    finally:
        if connection.is_connected():
            connection.close()
            logging.info("Database connection closed")

if __name__ == "__main__":
    main()