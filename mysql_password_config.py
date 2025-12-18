#!/usr/bin/env python3
"""
MySQL Password Reset Guide and Helper
"""

import subprocess
import sys
import os

def check_mysql_service():
    """Check if MySQL service is running"""
    try:
        # Check MySQL service status
        result = subprocess.run(['sc', 'query', 'mysql'], 
                              capture_output=True, text=True, shell=True)
        
        if 'RUNNING' in result.stdout:
            print("✅ MySQL service is running")
            return True
        else:
            print("❌ MySQL service is not running")
            return False
    except Exception as e:
        print(f"⚠️  Could not check MySQL service: {e}")
        return False

def reset_mysql_password():
    """Guide for resetting MySQL password"""
    print("\n🔧 MySQL Password Reset Steps:")
    print("=" * 50)
    
    print("\n1. Stop MySQL service:")
    print("   net stop mysql")
    print("   (Run as Administrator)")
    
    print("\n2. Create a temporary SQL file:")
    reset_sql = """ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_new_password';
FLUSH PRIVILEGES;"""
    
    with open('mysql_reset.sql', 'w') as f:
        f.write(reset_sql)
    
    print("   ✅ Created mysql_reset.sql file")
    
    print("\n3. Start MySQL with the reset file:")
    print("   mysqld --init-file=mysql_reset.sql --console")
    print("   (Run this in a separate command prompt)")
    
    print("\n4. In another command prompt, start MySQL normally:")
    print("   net start mysql")
    
    print("\n5. Test the new password:")
    print("   mysql -u root -p")
    
    print("\n6. Clean up:")
    print("   Delete the mysql_reset.sql file after use")

def find_mysql_config():
    """Find MySQL configuration files"""
    common_paths = [
        "C:\\ProgramData\\MySQL\\MySQL Server 8.0\\my.ini",
        "C:\\Program Files\\MySQL\\MySQL Server 8.0\\my.ini",
        "C:\\MySQL\\my.ini",
        "C:\\xampp\\mysql\\bin\\my.ini"
    ]
    
    print("\n📁 Looking for MySQL configuration files:")
    found_configs = []
    
    for path in common_paths:
        if os.path.exists(path):
            print(f"   ✅ Found: {path}")
            found_configs.append(path)
        else:
            print(f"   ❌ Not found: {path}")
    
    return found_configs

def check_xampp():
    """Check if XAMPP is installed"""
    xampp_paths = [
        "C:\\xampp\\mysql\\bin\\mysql.exe",
        "C:\\xampp\\xampp-control.exe"
    ]
    
    for path in xampp_paths:
        if os.path.exists(path):
            print(f"\n🔧 XAMPP detected at: {os.path.dirname(path)}")
            print("   For XAMPP MySQL:")
            print("   1. Start XAMPP Control Panel")
            print("   2. Start MySQL service")
            print("   3. Default user: root, password: (empty)")
            print("   4. Or use phpMyAdmin to set password")
            return True
    
    return False

def main():
    print("🔐 MySQL Database Password Configuration Helper")
    print("=" * 60)
    
    # Check MySQL service
    mysql_running = check_mysql_service()
    
    # Check for XAMPP
    xampp_found = check_xampp()
    
    # Find config files
    configs = find_mysql_config()
    
    print("\n🛠️  Configuration Options:")
    print("=" * 40)
    
    if xampp_found:
        print("\n1. XAMPP MySQL (Recommended for development):")
        print("   - Default: user=root, password=(empty)")
        print("   - Access via: http://localhost/phpmyadmin")
        print("   - Change password in phpMyAdmin")
    
    print("\n2. Standard MySQL Installation:")
    print("   - Reset password using steps above")
    print("   - Or reinstall MySQL with new password")
    
    print("\n3. Set Environment Variables:")
    print("   - MYSQL_USER=root")
    print("   - MYSQL_PASSWORD=your_password")
    print("   - MYSQL_HOST=localhost")
    print("   - MYSQL_PORT=3306")
    
    # Create a simple connection test
    print("\n4. Test Connection:")
    print("   python mysql_connection_test.py")
    
    if not mysql_running:
        print("\n⚠️  MySQL service is not running!")
        print("   Start it with: net start mysql")
        print("   (Run as Administrator)")
    
    # Password reset guide
    reset_mysql_password()

if __name__ == "__main__":
    main()