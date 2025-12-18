#!/usr/bin/env python3
"""
Create a demo doctor account for the Node.js EHR server
"""

import mysql.connector
import bcrypt
import json

def create_demo_doctor():
    """Create a demo doctor account and some sample patients"""
    
    try:
        # Connect to database
        connection = mysql.connector.connect(
            host='localhost',
            port=3306,
            user='root',
            password='',
            database='ehr_app'
        )
        
        cursor = connection.cursor()
        
        print("🏥 Creating demo doctor account...")
        
        # Create demo doctor
        email = "doctor@demo.com"
        password = "demo123"
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Check if doctor already exists
        cursor.execute("SELECT id FROM doctors WHERE email = %s", (email,))
        existing = cursor.fetchone()
        
        if existing:
            doctor_id = existing[0]
            print(f"✅ Demo doctor already exists (ID: {doctor_id})")
        else:
            cursor.execute("""
                INSERT INTO doctors (first_name, last_name, email, license_number, specialty, password_hash)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, ("Demo", "Doctor", email, "MD123456", "Internal Medicine", password_hash))
            
            doctor_id = cursor.lastrowid
            print(f"✅ Demo doctor created (ID: {doctor_id})")
        
        # Create sample patients if they don't exist
        print("\n👥 Creating sample patients...")
        
        sample_patients = [
            {
                "first_name": "John",
                "last_name": "Smith", 
                "date_of_birth": "1980-05-15",
                "gender": "Male",
                "email": "john.smith@email.com",
                "phone": "555-0123",
                "address": "123 Main St, City, State 12345",
                "blood_type": "O+",
                "height_cm": 175.0,
                "weight_kg": 70.0,
                "allergies": json.dumps(["Penicillin"]),
                "chronic_conditions": json.dumps(["Hypertension"]),
                "medications": json.dumps(["Lisinopril 10mg"])
            },
            {
                "first_name": "Maria",
                "last_name": "Garcia",
                "date_of_birth": "1975-09-22", 
                "gender": "Female",
                "email": "maria.garcia@email.com",
                "phone": "555-0124",
                "address": "456 Oak Ave, City, State 12345",
                "blood_type": "A+",
                "height_cm": 162.0,
                "weight_kg": 58.0,
                "allergies": json.dumps(["Sulfa drugs"]),
                "chronic_conditions": json.dumps(["Diabetes Type 2"]),
                "medications": json.dumps(["Metformin 500mg", "Insulin"])
            },
            {
                "first_name": "Robert",
                "last_name": "Johnson",
                "date_of_birth": "1965-12-08",
                "gender": "Male", 
                "email": "robert.johnson@email.com",
                "phone": "555-0125",
                "address": "789 Pine Rd, City, State 12345",
                "blood_type": "B+",
                "height_cm": 180.0,
                "weight_kg": 85.0,
                "allergies": json.dumps([]),
                "chronic_conditions": json.dumps(["High Cholesterol", "Arthritis"]),
                "medications": json.dumps(["Atorvastatin 20mg", "Ibuprofen"])
            }
        ]
        
        for patient_data in sample_patients:
            # Check if patient exists
            cursor.execute(
                "SELECT id FROM patients WHERE first_name = %s AND last_name = %s AND doctor_id = %s",
                (patient_data["first_name"], patient_data["last_name"], doctor_id)
            )
            
            if not cursor.fetchone():
                # Add doctor_id to patient data
                patient_data["doctor_id"] = doctor_id
                
                columns = ', '.join(patient_data.keys())
                placeholders = ', '.join(['%s'] * len(patient_data))
                
                cursor.execute(f"""
                    INSERT INTO patients ({columns})
                    VALUES ({placeholders})
                """, list(patient_data.values()))
                
                print(f"   ✅ Created patient: {patient_data['first_name']} {patient_data['last_name']}")
            else:
                print(f"   ⚠️  Patient exists: {patient_data['first_name']} {patient_data['last_name']}")
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print("\n" + "=" * 50)
        print("🎉 Demo setup complete!")
        print("=" * 50)
        print("📋 Login credentials for Node.js EHR:")
        print(f"   URL: http://localhost:5000")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print("\n💡 Steps to view patients:")
        print("1. Go to http://localhost:5000")
        print("2. Login with the credentials above")
        print("3. View the patient list") 
        print("4. Click on a patient to see details")
        print("5. Use the AI summary tool at http://localhost:8000")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    create_demo_doctor()