#!/usr/bin/env python3
"""
Test MySQL Connection
"""
import mysql.connector
from getpass import getpass

def test_connection():
    print("🔍 Testing MySQL Connection...")
    
    # Get connection details
    host = input("MySQL Host [localhost]: ") or 'localhost'
    port = input("MySQL Port [3306]: ") or '3306'
    user = input("MySQL User [root]: ") or 'root'
    password = getpass("MySQL Password: ")
    
    try:
        port = int(port)
    except ValueError:
        port = 3306
    
    try:
        # Test connection
        conn = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        
        cursor.execute("SHOW DATABASES")
        databases = [db[0] for db in cursor.fetchall()]
        
        print(f"✅ Connected to MySQL!")
        print(f"📊 MySQL Version: {version}")
        print(f"🗄️  Available databases: {', '.join(databases)}")
        
        cursor.close()
        conn.close()
        
    except mysql.connector.Error as e:
        print(f"❌ Connection failed: {e}")
        print("\n💡 Troubleshooting tips:")
        print("   - Check if MySQL is running")
        print("   - Verify username and password") 
        print("   - Check if host/port are correct")
        print("   - Try connecting with MySQL Workbench first")

if __name__ == "__main__":
    test_connection()