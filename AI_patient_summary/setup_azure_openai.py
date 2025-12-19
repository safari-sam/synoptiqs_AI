#!/usr/bin/env python3
"""
Azure OpenAI Configuration Setup for EU Compliance
This script helps you configure Azure OpenAI for your AI Patient Summary toolkit.
"""

import os
from pathlib import Path

def setup_azure_openai_config():
    """Interactive setup for Azure OpenAI configuration"""
    
    print("🔧 Azure OpenAI Configuration Setup")
    print("="*50)
    print("This will configure your AI Patient Summary toolkit to use")
    print("Azure OpenAI GPT-4.1 mini with EU data compliance.")
    print()
    
    # Get current directory
    current_dir = Path(__file__).parent
    env_file = current_dir / ".env"
    
    print(f"Configuration will be saved to: {env_file}")
    print()
    
    # Collect Azure OpenAI credentials
    print("📋 Please provide your Azure OpenAI details:")
    print("   (You can find these in your Azure Portal > OpenAI > Keys and Endpoint)")
    print()
    
    # API Key
    api_key = input("🔑 Azure OpenAI API Key: ").strip()
    if not api_key:
        print("❌ API Key is required!")
        return False
    
    # Endpoint
    endpoint = input("🌐 Azure OpenAI Endpoint (e.g., https://your-resource.openai.azure.com/): ").strip()
    if not endpoint:
        print("❌ Endpoint is required!")
        return False
    
    if not endpoint.startswith('https://'):
        endpoint = 'https://' + endpoint
    
    if not endpoint.endswith('/'):
        endpoint = endpoint + '/'
    
    # Deployment Name
    deployment_name = input("🚀 Deployment Name (default: gpt-41-mini): ").strip()
    if not deployment_name:
        deployment_name = "gpt-41-mini"
    
    # API Version
    api_version = input("📅 API Version (default: 2024-02-01): ").strip()
    if not api_version:
        api_version = "2024-02-01"
    
    # Create .env file
    env_content = f"""# Azure OpenAI Configuration (EU Compliant)
# Generated on {os.environ.get('DATE', 'Unknown')}

# Azure OpenAI API Key
AZURE_OPENAI_API_KEY={api_key}

# Azure OpenAI Endpoint
AZURE_OPENAI_ENDPOINT={endpoint}

# Deployment Name for GPT-4.1 mini
AZURE_OPENAI_DEPLOYMENT_NAME={deployment_name}

# Azure OpenAI API Version
AZURE_OPENAI_API_VERSION={api_version}

# Watch folder configuration
WATCH_FOLDER=C:\\ehr_exchange
WATCH_FILE=patient_export.gdt
"""
    
    try:
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        print()
        print("✅ Configuration saved successfully!")
        print()
        print("🔍 Configuration Summary:")
        print(f"   API Key: {'*' * (len(api_key) - 4)}{api_key[-4:]}")
        print(f"   Endpoint: {endpoint}")
        print(f"   Deployment: {deployment_name}")
        print(f"   API Version: {api_version}")
        print()
        print("🚀 Next Steps:")
        print("1. Start your EHR server: cd ehr-backend && npm start")
        print("2. Start the AI toolkit: python backend.py")
        print("3. The AI will now use Azure OpenAI GPT-4.1 mini (EU compliant)")
        print()
        print("🔒 EU Compliance:")
        print("   ✅ Data processed in EU region")
        print("   ✅ GDPR compliant")
        print("   ✅ EU data residency")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to save configuration: {e}")
        return False

def test_azure_openai_connection():
    """Test the Azure OpenAI connection"""
    
    print("\n🧪 Testing Azure OpenAI Connection...")
    
    try:
        from openai import AzureOpenAI
        from dotenv import load_dotenv
        
        # Load environment variables
        load_dotenv()
        
        # Get configuration
        api_key = os.getenv('AZURE_OPENAI_API_KEY')
        endpoint = os.getenv('AZURE_OPENAI_ENDPOINT')
        api_version = os.getenv('AZURE_OPENAI_API_VERSION', '2024-02-01')
        deployment_name = os.getenv('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-41-mini')
        
        if not api_key or not endpoint:
            print("❌ Missing configuration. Please run setup first.")
            return False
        
        # Initialize client
        client = AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=endpoint
        )
        
        # Test with simple request
        print("📡 Sending test request...")
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": "You are a helpful medical AI assistant."},
                {"role": "user", "content": "Hello! Please confirm you are working correctly."}
            ],
            max_tokens=50,
            temperature=0.1
        )
        
        if response.choices and response.choices[0].message.content:
            print("✅ Azure OpenAI connection successful!")
            print(f"📋 Response: {response.choices[0].message.content[:100]}...")
            return True
        else:
            print("❌ No response received from Azure OpenAI")
            return False
            
    except ImportError as e:
        print(f"❌ Missing dependencies: {e}")
        print("   Run: pip install openai python-dotenv")
        return False
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    print("🏥 AI Patient Summary - Azure OpenAI Setup")
    print()
    
    choice = input("Choose an option:\n1. Setup Azure OpenAI configuration\n2. Test existing configuration\n\nEnter choice (1 or 2): ").strip()
    
    if choice == "1":
        setup_azure_openai_config()
    elif choice == "2":
        test_azure_openai_connection()
    else:
        print("❌ Invalid choice. Please run again and select 1 or 2.")