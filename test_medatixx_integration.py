#!/usr/bin/env python3
"""
Test script for medatixx database integration with EHR system
"""

import requests
import json

def test_medatixx_integration():
    """Test all medatixx API endpoints"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Medatixx Database Integration")
    print("=" * 50)
    
    # Test 1: Categories
    print("\n📊 Testing categories endpoint...")
    try:
        response = requests.get(f"{base_url}/api/medatixx/categories", params={"limit": 5})
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Categories: Found {len(data['data'])} categories")
            for cat in data['data'][:3]:
                print(f"   - {cat['Kategorie']}: {cat['KategorieLangtext']} ({cat['count']} forms)")
        else:
            print(f"❌ Categories failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Categories error: {e}")
    
    # Test 2: Search
    print("\n🔍 Testing search endpoint...")
    try:
        response = requests.get(f"{base_url}/api/medatixx/search", params={"q": "Rezept", "limit": 3})
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Search 'Rezept': Found {len(data['data'])} results")
            for form in data['data']:
                print(f"   - #{form['Nummer']}: {form['Suchwort']} ({form['Kategorie']})")
        else:
            print(f"❌ Search failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Search error: {e}")
    
    # Test 3: Forms by category
    print("\n📋 Testing forms by category...")
    try:
        response = requests.get(f"{base_url}/api/medatixx/forms", params={"category": "R", "limit": 3})
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Category 'R': Found {len(data['data'])} forms")
            for form in data['data']:
                print(f"   - #{form['Nummer']}: {form['Suchwort']}")
        else:
            print(f"❌ Forms by category failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Forms by category error: {e}")
    
    # Test 4: Statistics
    print("\n📈 Testing statistics endpoint...")
    try:
        response = requests.get(f"{base_url}/api/medatixx/stats")
        if response.status_code == 200:
            data = response.json()
            stats = data['data']
            print(f"✅ Statistics:")
            print(f"   - Total records: {stats['total_records']}")
            print(f"   - Categories: {len(stats['categories'])}")
            print(f"   - Top category: {stats['categories'][0]['Kategorie']} ({stats['categories'][0]['count']} forms)")
        else:
            print(f"❌ Statistics failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Statistics error: {e}")
    
    # Test 5: Form detail
    print("\n📄 Testing form detail endpoint...")
    try:
        response = requests.get(f"{base_url}/api/medatixx/form/1")
        if response.status_code == 200:
            data = response.json()
            form = data['data']
            print(f"✅ Form detail #1:")
            print(f"   - Name: {form['Suchwort']}")
            print(f"   - Category: {form['Kategorie']} - {form['KategorieLangtext']}")
            print(f"   - Program: {form.get('ProgrammName', 'N/A')}")
        else:
            print(f"❌ Form detail failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Form detail error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Integration test completed!")
    print("✨ Access the full interface at: http://localhost:8000")
    print("📋 New 'Forms Library' tab available in the EHR sidebar")

if __name__ == "__main__":
    test_medatixx_integration()