#!/usr/bin/env python3
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

print("🔍 Testing AzureOpenAI Client Creation")
print("=" * 50)

try:
    from openai import AzureOpenAI
    print("✅ AzureOpenAI import successful")
    
    # Get environment variables
    foundry_key = os.getenv('FOUNDRY_API_KEY')
    foundry_endpoint = os.getenv('FOUNDRY_ENDPOINT')
    foundry_api_version = os.getenv('FOUNDRY_API_VERSION', '2024-05-01-preview')
    foundry_deployment = os.getenv('FOUNDRY_DEPLOYMENT_NAME', 'gpt-4.1-mini')
    
    print(f"📋 Configuration:")
    print(f"  API Key: {foundry_key[:10]}...{foundry_key[-10:] if foundry_key else 'None'}")
    print(f"  Endpoint: {foundry_endpoint}")
    print(f"  API Version: {foundry_api_version}")
    print(f"  Deployment: {foundry_deployment}")
    
    if foundry_key and foundry_endpoint:
        # Try different initialization approaches
        print("\n🔧 Attempting client creation...")
        
        try:
            # Method 1: Basic AzureOpenAI client
            client = AzureOpenAI(
                api_key=foundry_key,
                api_version=foundry_api_version,
                azure_endpoint=foundry_endpoint
            )
            print("✅ Method 1: Basic client creation successful")
            
            # Test a simple API call
            print("\n🧪 Testing API call...")
            response = client.chat.completions.create(
                model=foundry_deployment,
                messages=[{"role": "user", "content": "Hello, test message"}],
                max_tokens=10
            )
            print("✅ API call successful!")
            print(f"Response: {response.choices[0].message.content}")
            
        except Exception as e:
            print(f"❌ Client creation failed: {e}")
            print(f"Error type: {type(e).__name__}")
            
            # Try alternative approach
            print("\n🔧 Trying alternative client creation...")
            try:
                # Remove potentially problematic parameters
                client = AzureOpenAI(
                    api_key=foundry_key,
                    azure_endpoint=foundry_endpoint,
                    api_version=foundry_api_version
                )
                print("✅ Alternative method successful")
            except Exception as e2:
                print(f"❌ Alternative method also failed: {e2}")
                
    else:
        print("❌ Missing required environment variables")
        
except ImportError as e:
    print(f"❌ AzureOpenAI import failed: {e}")