#!/usr/bin/env python3
"""
Test MySQL connection on different ports
"""

import mysql.connector
from mysql.connector import Error

def test_mysql_ports():
    """Test MySQL connection on different ports"""
    
    print("🔍 Testing MySQL Connection Ports")
    print("=" * 40)
    
    ports_to_test = [3306, 5000, 3307, 8080]
    
    for port in ports_to_test:
        print(f"\n📊 Testing port {port}...")
        try:
            config = {
                'host': 'localhost',
                'user': 'root',
                'password': '',
                'port': port,
                'connect_timeout': 5
            }
            
            connection = mysql.connector.connect(**config)
            if connection.is_connected():
                cursor = connection.cursor()
                cursor.execute("SHOW DATABASES")
                databases = cursor.fetchall()
                print(f"✅ Port {port}: Connected successfully!")
                print(f"   Databases found: {[db[0] for db in databases[:5]]}")
                
                # Check if medatixx database exists
                db_names = [db[0] for db in databases]
                if 'medatixx' in db_names:
                    print(f"   ✅ medatixx database exists")
                else:
                    print(f"   ⚠️  medatixx database not found")
                
                cursor.close()
                connection.close()
                return port  # Return the working port
            
        except Error as e:
            print(f"❌ Port {port}: {e}")
        except Exception as e:
            print(f"❌ Port {port}: Connection failed - {e}")
    
    print(f"\n❌ No working MySQL port found")
    return None

if __name__ == "__main__":
    working_port = test_mysql_ports()
    
    if working_port:
        print(f"\n🎉 Found working MySQL on port {working_port}")
        print(f"📋 Use this port for your EHR configuration")
    else:
        print(f"\n💡 Troubleshooting suggestions:")
        print(f"1. Check if MySQL/XAMPP is running")
        print(f"2. Check MySQL configuration for the actual port")
        print(f"3. Try: netstat -an | findstr :3306")
        print(f"4. Try: netstat -an | findstr :5000")