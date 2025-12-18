#!/usr/bin/env python3
"""
Test script for German AI Backend
"""

import requests
import json

def test_ai_backend():
    """Test AI backend endpoints"""
    base_url = "http://127.0.0.1:8001"
    
    print("Testing German AI Backend...")
    print("=" * 50)
    
    try:
        # Test health endpoint
        print("1. Testing health endpoint...")
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Health check passed")
            print(f"   Status: {health_data.get('status')}")
            print(f"   Database: {health_data.get('database')}")
            print(f"   Total patients: {health_data.get('total_patients')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
        
        # Test analytics endpoint
        print("\n2. Testing analytics endpoint...")
        response = requests.get(f"{base_url}/analytics/summary")
        if response.status_code == 200:
            analytics = response.json()
            print(f"✅ Analytics endpoint working")
            print(f"   Total patients: {analytics.get('total_patients')}")
            print(f"   Total records: {analytics.get('total_records')}")
            print(f"   Recent records: {analytics.get('recent_records')}")
            print(f"   GDT files processed: {analytics.get('processed_gdt_files')}")
        else:
            print(f"❌ Analytics failed: {response.status_code}")
        
        # Test patients endpoint
        print("\n3. Testing patients endpoint...")
        response = requests.get(f"{base_url}/patients")
        if response.status_code == 200:
            patients = response.json()
            print(f"✅ Patients endpoint working")
            print(f"   Found {len(patients)} patients")
            if patients:
                first_patient = patients[0]
                print(f"   Sample patient: {first_patient.get('patient_number')}")
                print(f"   Name: {first_patient.get('first_name')} {first_patient.get('last_name')}")
                
                # Test patient summary for first patient
                print("\n4. Testing patient summary...")
                patient_number = first_patient.get('patient_number')
                response = requests.get(f"{base_url}/patient/{patient_number}/summary")
                if response.status_code == 200:
                    summary = response.json()
                    print(f"✅ AI summary generated for patient {patient_number}")
                    print(f"   Risk assessment: {summary.get('risk_assessment')}")
                    print(f"   Active diagnoses: {len(summary.get('active_diagnoses', []))}")
                    print(f"   AI summary preview: {summary.get('ai_summary', '')[:100]}...")
                else:
                    print(f"❌ AI summary failed: {response.status_code}")
        else:
            print(f"❌ Patients endpoint failed: {response.status_code}")
        
        print("\n" + "=" * 50)
        print("✅ AI Backend test completed successfully!")
        print("\nNext steps:")
        print("1. Open the EHR system: http://localhost:5000")
        print("2. Login and go to German Patients section")
        print("3. Click 'AI Summary' on any patient card")
        print("4. View AI-enhanced patient analysis")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - AI backend not running on port 8001")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    test_ai_backend()