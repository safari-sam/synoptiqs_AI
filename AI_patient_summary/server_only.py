#!/usr/bin/env python3
"""
Simple server-only launcher for the AI backend
This runs just the FastAPI server without the webview component
"""

import os
import sys
from pathlib import Path

# Set environment to skip webview
os.environ['SKIP_WEBVIEW'] = '1'

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import the FastAPI app from backend
from backend import app
import uvicorn

if __name__ == "__main__":
    print("🚀 Starting AI Backend Server (Server-Only Mode)")
    print("📡 Server will run on http://127.0.0.1:8000")
    print("🔧 Use Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        uvicorn.run(
            "backend:app",
            host="127.0.0.1",
            port=8000,
            reload=False,
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n💤 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)