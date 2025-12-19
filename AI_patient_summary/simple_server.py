#!/usr/bin/env python3
"""
Simple AI backend server without pre-loading
"""

import os
import sys
from pathlib import Path

# Set environment to skip webview
os.environ['SKIP_WEBVIEW'] = '1'
os.environ['SKIP_PRELOAD'] = '1'

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Create a simplified FastAPI app without the problematic startup event
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import necessary components from backend
from backend import (
    app as original_app, 
    generate_ai_summary_endpoint,
    get_patient_summary_endpoint,
    get_recent_patients_endpoint,
    batch_summary_endpoint,
    health_check_endpoint,
    export_patient_endpoint
)

# Create a new app with the same routes but without startup events
app = FastAPI(title="AI Patient Summary API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://127.0.0.1:5000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Copy the routes from the original app
app.post("/api/generate-summary")(generate_ai_summary_endpoint)
app.get("/api/patient/{patient_id}/summary")(get_patient_summary_endpoint)
app.get("/api/recent-patients")(get_recent_patients_endpoint)
app.post("/api/batch-summary")(batch_summary_endpoint)
app.get("/health")(health_check_endpoint)
app.post("/api/export-patient")(export_patient_endpoint)

if __name__ == "__main__":
    print("🚀 Starting AI Backend Server (Simple Mode)")
    print("📡 Server will run on http://127.0.0.1:8000")
    print("🔧 Use Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        uvicorn.run(
            app,
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