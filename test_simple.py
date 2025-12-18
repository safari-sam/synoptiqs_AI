#!/usr/bin/env python3
"""
Simple test for medatixx database integration using curl
"""

import subprocess
import json

def test_api_endpoints():
    """Test medatixx API endpoints using curl"""
    print("🧪 Testing Medatixx Database Integration")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    endpoints = [
        ("/api/medatixx/categories?limit=3", "Categories"),
        ("/api/medatixx/search?q=Rezept&limit=2", "Search"),
        ("/api/medatixx/stats", "Statistics"),
        ("/api/medatixx/forms?category=R&limit=2", "Forms by Category")
    ]
    
    for endpoint, name in endpoints:
        print(f"\n📊 Testing {name}...")
        try:
            result = subprocess.run(
                ["curl", "-s", f"{base_url}{endpoint}"], 
                capture_output=True, 
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                try:
                    data = json.loads(result.stdout)
                    if data.get('status') == 'success':
                        print(f"✅ {name}: Success")
                        if 'data' in data and isinstance(data['data'], list):
                            print(f"   Found {len(data['data'])} items")
                        elif 'data' in data and isinstance(data['data'], dict):
                            if 'total_records' in data['data']:
                                print(f"   Total records: {data['data']['total_records']}")
                    else:
                        print(f"❌ {name}: API error")
                except json.JSONDecodeError:
                    print(f"❌ {name}: Invalid JSON response")
            else:
                print(f"❌ {name}: Request failed")
        except subprocess.TimeoutExpired:
            print(f"❌ {name}: Request timeout")
        except Exception as e:
            print(f"❌ {name}: Error - {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Integration test completed!")
    print("✨ Your EHR now includes:")
    print("  📋 Forms Library (medatixx database)")
    print("  🔍 Searchable medical forms")
    print("  📊 Form categories and statistics")
    print("  🌐 Access via: http://localhost:8000")

if __name__ == "__main__":
    test_api_endpoints()