#!/usr/bin/env python3
"""
MySQL Connection Tester
"""

import mysql.connector
from mysql.connector import Error

def test_connection():
    """Test MySQL connection with different configurations"""
    print("🔍 MySQL Connection Tester")
    print("=" * 40)
    
    # Common configurations to try
    configs = [
        {"host": "localhost", "port": 3306, "user": "root"},
        {"host": "127.0.0.1", "port": 3306, "user": "root"},
        {"host": "localhost", "port": 3307, "user": "root"},  # Alternative port
        {"host": "localhost", "port": 3306, "user": "admin"},
        {"host": "localhost", "port": 3306, "user": "mysql"},
    ]
    
    password = input("Enter password to test: ")
    
    for i, config in enumerate(configs, 1):
        print(f"\n{i}. Testing {config['user']}@{config['host']}:{config['port']}")
        try:
            connection = mysql.connector.connect(
                host=config['host'],
                port=config['port'],
                user=config['user'],
                password=password,
                connect_timeout=5
            )
            
            if connection.is_connected():
                cursor = connection.cursor()
                cursor.execute("SELECT VERSION()")
                version = cursor.fetchone()
                print(f"   ✅ SUCCESS! MySQL version: {version[0]}")
                
                # Show databases
                cursor.execute("SHOW DATABASES")
                databases = cursor.fetchall()
                print(f"   📊 Available databases: {[db[0] for db in databases[:5]]}")
                
                cursor.close()
                connection.close()
                return config
                
        except Error as e:
            print(f"   ❌ Failed: {e}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n💡 Troubleshooting suggestions:")
    print("1. Check if MySQL service is running: net start | findstr -i mysql")
    print("2. Try MySQL Workbench or phpMyAdmin to test credentials")
    print("3. Check MySQL configuration file for port/settings")
    print("4. Consider using XAMPP/WAMP if installed")
    
    return None

def check_mysql_service():
    """Check if MySQL service is running"""
    print("\n🔍 Checking MySQL services...")
    import subprocess
    
    try:
        result = subprocess.run(['net', 'start'], capture_output=True, text=True, shell=True)
        services = result.stdout
        
        mysql_services = [line.strip() for line in services.split('\n') if 'mysql' in line.lower()]
        
        if mysql_services:
            print("✅ Found MySQL services:")
            for service in mysql_services:
                print(f"   - {service}")
        else:
            print("❌ No MySQL services found running")
            print("\n💡 Try starting MySQL:")
            print("   net start mysql")
            print("   or")
            print("   net start mysql80  (for MySQL 8.0)")
    
    except Exception as e:
        print(f"❌ Error checking services: {e}")

if __name__ == "__main__":
    check_mysql_service()
    working_config = test_connection()
    
    if working_config:
        print(f"\n🎉 Working configuration found!")
        print(f"Host: {working_config['host']}")
        print(f"Port: {working_config['port']}")
        print(f"User: {working_config['user']}")
        print("\nUse these settings for the export script.")
    else:
        print(f"\n❌ No working configuration found.")
        print("Please check MySQL installation and credentials.")