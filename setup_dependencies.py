#!/usr/bin/env python3
"""
Setup script to install dependencies for medatixx database export
"""

import subprocess
import sys
import os

def install_package(package):
    """Install a Python package using pip"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✅ {package} installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install {package}: {e}")
        return False

def main():
    print("🔧 Setting up medatixx database export dependencies")
    print("=" * 50)
    
    # Required packages
    packages = [
        "mysql-connector-python",
        "pandas",
        "openpyxl"  # For Excel file support if needed later
    ]
    
    print("Installing required packages...")
    success_count = 0
    
    for package in packages:
        print(f"\n📦 Installing {package}...")
        if install_package(package):
            success_count += 1
    
    print(f"\n📊 Installation Summary:")
    print(f"✅ {success_count}/{len(packages)} packages installed successfully")
    
    if success_count == len(packages):
        print("\n🎉 All dependencies installed successfully!")
        print("\nNext steps:")
        print("1. Make sure MySQL server is running")
        print("2. Update the password in simple_export_medatixx.py")
        print("3. Run: python simple_export_medatixx.py")
    else:
        print("\n⚠️  Some packages failed to install. Please check the errors above.")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    main()