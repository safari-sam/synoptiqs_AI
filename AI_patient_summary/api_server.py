#!/usr/bin/env python3
"""
AI Backend Server - API Only Mode
Runs the FastAPI server without desktop components
"""

import os
import sys
import time
from pathlib import Path

# Set environment to avoid desktop components
os.environ['SKIP_WEBVIEW'] = '1'

# Change to the AI_patient_summary directory
script_dir = Path(__file__).parent.absolute()
os.chdir(script_dir)
sys.path.insert(0, str(script_dir))

try:
    # Import the FastAPI app
    from backend import app
    import uvicorn
    
    print("🚀 AI Backend Server - API Only Mode")
    print("📡 Server will run on http://127.0.0.1:8000")
    print("🔧 Use Ctrl+C to stop the server")
    print("-" * 50)
    
    # Start the server
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=False,
        access_log=True,
        log_level="info"
    )
    
except KeyboardInterrupt:
    print("\n💤 Server stopped by user")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're in the correct directory with backend.py")
except Exception as e:
    print(f"❌ Server error: {e}")
    
print("Server has stopped.")