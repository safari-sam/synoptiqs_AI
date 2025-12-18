#!/usr/bin/env python3
"""
GDT File Processor for German Patient Data
Watches for incoming GDT files, parses them, and stores in database for AI processing.
"""

import os
import time
import mysql.connector
from mysql.connector import Error
import logging
from datetime import datetime
import shutil
import re
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class GDTFileHandler(FileSystemEventHandler):
    def __init__(self, db_connection):
        self.db_connection = db_connection
        
    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith('.gdt'):
            logging.info(f"New GDT file detected: {event.src_path}")
            self.process_gdt_file(event.src_path)
    
    def process_gdt_file(self, file_path):
        """Process a single GDT file"""
        try:
            logging.info(f"Processing GDT file: {file_path}")
            
            # Parse GDT file
            gdt_data = self.parse_gdt_file(file_path)
            
            if gdt_data:
                # Store in database
                self.store_gdt_data(gdt_data, file_path)
                
                # Move to processed folder
                processed_path = file_path.replace('incoming', 'processed')
                os.makedirs(os.path.dirname(processed_path), exist_ok=True)
                shutil.move(file_path, processed_path)
                
                logging.info(f"Successfully processed: {os.path.basename(file_path)}")
            else:
                # Move to errors folder
                error_path = file_path.replace('incoming', 'errors')
                os.makedirs(os.path.dirname(error_path), exist_ok=True)
                shutil.move(file_path, error_path)
                
                logging.error(f"Failed to parse: {os.path.basename(file_path)}")
        
        except Exception as e:
            logging.error(f"Error processing {file_path}: {e}")
    
    def parse_gdt_file(self, file_path):
        """Parse GDT file format"""
        try:
            with open(file_path, 'r', encoding='iso-8859-1') as f:
                lines = f.readlines()
            
            gdt_data = {
                'patient_number': None,
                'patient_name': None,
                'birth_date': None,
                'gender': None,
                'visit_date': None,
                'diagnoses': [],
                'treatments': [],
                'notes': [],
                'provider': None,
                'department': None
            }
            
            for line in lines:
                line = line.strip()
                if len(line) < 12:
                    continue
                
                # GDT format: length(3) + record_type(4) + data
                length = line[:3]
                record_type = line[3:7]
                data = line[7:]
                
                # Parse different record types
                if record_type == '3101':  # Patient number
                    gdt_data['patient_number'] = data
                elif record_type == '3102':  # Patient last name
                    gdt_data['patient_name'] = data
                elif record_type == '3103':  # Patient first name
                    if gdt_data['patient_name']:
                        gdt_data['patient_name'] = data + ' ' + gdt_data['patient_name']
                    else:
                        gdt_data['patient_name'] = data
                elif record_type == '3104':  # Birth date
                    try:
                        birth_str = data
                        if len(birth_str) == 8:  # DDMMYYYY
                            day = birth_str[:2]
                            month = birth_str[2:4]
                            year = birth_str[4:8]
                            gdt_data['birth_date'] = f"{year}-{month}-{day}"
                    except:
                        pass
                elif record_type == '3105':  # Gender
                    gdt_data['gender'] = 'M' if data == '1' else 'F' if data == '2' else None
                elif record_type == '3110':  # Visit date
                    try:
                        visit_str = data
                        if len(visit_str) == 8:  # DDMMYYYY
                            day = visit_str[:2]
                            month = visit_str[2:4]
                            year = visit_str[4:8]
                            gdt_data['visit_date'] = f"{year}-{month}-{day}"
                    except:
                        pass
                elif record_type == '6200':  # ICD code
                    gdt_data['diagnoses'].append({'icd_code': data})
                elif record_type == '6201':  # Diagnosis text
                    if gdt_data['diagnoses']:
                        gdt_data['diagnoses'][-1]['description'] = data
                elif record_type == '6220':  # Additional diagnosis info
                    if gdt_data['diagnoses']:
                        gdt_data['diagnoses'][-1]['notes'] = data
                elif record_type == '8310':  # Provider/Hospital name
                    gdt_data['provider'] = data
                elif record_type == '8320':  # Department
                    gdt_data['department'] = data
            
            # Validate required fields
            if not gdt_data['patient_number']:
                logging.warning(f"No patient number found in {file_path}")
                return None
            
            return gdt_data
            
        except Exception as e:
            logging.error(f"Error parsing GDT file {file_path}: {e}")
            return None
    
    def store_gdt_data(self, gdt_data, file_path):
        """Store parsed GDT data in database"""
        cursor = self.db_connection.cursor()
        
        try:
            # Insert/update patient master data
            if gdt_data['patient_name'] or gdt_data['birth_date']:
                patient_sql = """
                INSERT INTO patients_master 
                (patient_number, first_name, last_name, date_of_birth, gender, last_visit_date)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                first_name = COALESCE(VALUES(first_name), first_name),
                last_name = COALESCE(VALUES(last_name), last_name),
                date_of_birth = COALESCE(VALUES(date_of_birth), date_of_birth),
                gender = COALESCE(VALUES(gender), gender),
                last_visit_date = VALUES(last_visit_date),
                total_visits = total_visits + 1
                """
                
                # Split name if available
                first_name = last_name = None
                if gdt_data['patient_name']:
                    name_parts = gdt_data['patient_name'].split()
                    if len(name_parts) >= 2:
                        first_name = name_parts[0]
                        last_name = ' '.join(name_parts[1:])
                    else:
                        last_name = gdt_data['patient_name']
                
                cursor.execute(patient_sql, (
                    gdt_data['patient_number'],
                    first_name,
                    last_name,
                    gdt_data['birth_date'],
                    gdt_data['gender'],
                    gdt_data['visit_date'] or datetime.now().strftime('%Y-%m-%d')
                ))
            
            # Insert medical records for each diagnosis
            for diagnosis in gdt_data['diagnoses']:
                record_sql = """
                INSERT INTO medical_records 
                (patient_number, visit_date, record_type, category, icd_code, diagnosis_text, notes, provider_name, department)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(record_sql, (
                    gdt_data['patient_number'],
                    gdt_data['visit_date'] or datetime.now().strftime('%Y-%m-%d'),
                    'GDT',
                    'Diagnosis',
                    diagnosis.get('icd_code'),
                    diagnosis.get('description'),
                    diagnosis.get('notes'),
                    gdt_data['provider'],
                    gdt_data['department']
                ))
            
            # Log GDT file processing
            gdt_sql = """
            INSERT INTO gdt_files 
            (patient_number, filename, file_path, file_size, processed_date, processing_status)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
            cursor.execute(gdt_sql, (
                gdt_data['patient_number'],
                os.path.basename(file_path),
                file_path,
                file_size,
                datetime.now(),
                'completed'
            ))
            
            self.db_connection.commit()
            logging.info(f"Stored GDT data for patient {gdt_data['patient_number']}")
            
        except Error as e:
            logging.error(f"Database error storing GDT data: {e}")
            self.db_connection.rollback()

def connect_to_german_database():
    """Connect to German patient database"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='german_ehr_system',
            user='root',
            password=''  # XAMPP default
        )
        if connection.is_connected():
            logging.info("Connected to German patient database")
            return connection
    except Error as e:
        logging.error(f"Error connecting to database: {e}")
        return None

def main():
    """Main GDT file processor"""
    logging.info("Starting GDT File Processor")
    
    # Connect to database
    db_connection = connect_to_german_database()
    if not db_connection:
        logging.error("Could not connect to database. Exiting.")
        return
    
    # Setup file watcher
    watch_directory = "C:\\gdt_exchange\\incoming"
    if not os.path.exists(watch_directory):
        os.makedirs(watch_directory, exist_ok=True)
        logging.info(f"Created watch directory: {watch_directory}")
    
    event_handler = GDTFileHandler(db_connection)
    observer = Observer()
    observer.schedule(event_handler, watch_directory, recursive=False)
    
    try:
        observer.start()
        logging.info(f"Watching for GDT files in: {watch_directory}")
        
        # Process any existing files in the directory
        for filename in os.listdir(watch_directory):
            if filename.endswith('.gdt'):
                file_path = os.path.join(watch_directory, filename)
                event_handler.process_gdt_file(file_path)
        
        while True:
            time.sleep(10)  # Check every 10 seconds
            
    except KeyboardInterrupt:
        observer.stop()
        logging.info("GDT File Processor stopped by user")
    except Exception as e:
        logging.error(f"GDT Processor error: {e}")
    finally:
        observer.join()
        if db_connection.is_connected():
            db_connection.close()
            logging.info("Database connection closed")

if __name__ == "__main__":
    main()