#!/usr/bin/env python3
import os
import inspect
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

print("🔍 Debugging AzureOpenAI Initialization")
print("=" * 50)

try:
    from openai import AzureOpenAI
    print("✅ AzureOpenAI import successful")
    
    # Inspect the AzureOpenAI class
    print(f"\n📋 AzureOpenAI class info:")
    print(f"Module: {AzureOpenAI.__module__}")
    print(f"Class: {AzureOpenAI.__name__}")
    
    # Get the signature of __init__
    sig = inspect.signature(AzureOpenAI.__init__)
    print(f"\n🔧 __init__ signature:")
    for param in sig.parameters.values():
        if param.name != 'self':
            print(f"  {param.name}: {param.annotation}")
    
    # Try minimal initialization
    print(f"\n🧪 Testing minimal initialization...")
    foundry_key = os.getenv('FOUNDRY_API_KEY')
    foundry_endpoint = os.getenv('FOUNDRY_ENDPOINT')
    
    try:
        # Most minimal possible initialization
        client = AzureOpenAI(
            api_key=foundry_key,
            azure_endpoint=foundry_endpoint
        )
        print("✅ Minimal initialization successful!")
    except Exception as e:
        print(f"❌ Minimal initialization failed: {e}")
        print(f"Error type: {type(e).__name__}")
        
        # Check if there are any httpx or networking conflicts
        print(f"\n🔍 Checking for conflicts...")
        try:
            import httpx
            print(f"httpx version: {httpx.__version__}")
        except ImportError:
            print("httpx not found")
            
except ImportError as e:
    print(f"❌ AzureOpenAI import failed: {e}")
except Exception as e:
    print(f"❌ Unexpected error: {e}")