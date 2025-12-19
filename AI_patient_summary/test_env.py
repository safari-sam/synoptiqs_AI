#!/usr/bin/env python3
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

print("🔍 Environment Variables Test")
print("=" * 50)

# Check all environment variables
env_vars = [
    'FOUNDRY_API_KEY',
    'FOUNDRY_ENDPOINT', 
    'FOUNDRY_DEPLOYMENT_NAME',
    'FOUNDRY_API_VERSION'
]

for var in env_vars:
    value = os.getenv(var)
    if value:
        # Show first and last 10 characters for security
        if len(value) > 20:
            display_value = f"{value[:10]}...{value[-10:]}"
        else:
            display_value = value
        print(f"✅ {var}: {display_value}")
    else:
        print(f"❌ {var}: Not found")

print("\n📁 File System Check")
print(f"Current dir: {os.getcwd()}")
print(f"Script dir: {Path(__file__).parent}")
print(f".env path: {Path(__file__).parent / '.env'}")
print(f".env exists: {(Path(__file__).parent / '.env').exists()}")

# Test Azure OpenAI import
print("\n📦 Package Test")
try:
    from openai import AzureOpenAI
    print("✅ AzureOpenAI import successful")
    
    # Test creating client with our values
    foundry_key = os.getenv('FOUNDRY_API_KEY')
    foundry_endpoint = os.getenv('FOUNDRY_ENDPOINT')
    foundry_api_version = os.getenv('FOUNDRY_API_VERSION', '2024-05-01-preview')
    
    if foundry_key and foundry_endpoint:
        try:
            client = AzureOpenAI(
                api_key=foundry_key,
                api_version=foundry_api_version,
                azure_endpoint=foundry_endpoint
            )
            print("✅ Microsoft Foundry client created successfully")
        except Exception as e:
            print(f"❌ Failed to create client: {e}")
    else:
        print("❌ Missing required environment variables")
        
except ImportError as e:
    print(f"❌ AzureOpenAI import failed: {e}")