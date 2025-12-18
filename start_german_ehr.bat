@echo off
echo Starting German EHR System with AI Backend Integration
echo ======================================================

echo.
echo 1. Starting AI Backend on port 8001...
start "AI Backend" cmd /k "cd /d c:\Users\safar\Desktop\HACKATHON2 && C:/Users/safar/Desktop/HACKATHON2/.venv/Scripts/python.exe -m uvicorn german_ai_backend:app --host 127.0.0.1 --port 8001"

echo.
echo 2. Waiting for AI Backend to start...
timeout /t 5 /nobreak > nul

echo.
echo 3. Starting Main EHR Server on port 5000...
start "EHR Server" cmd /k "cd /d c:\Users\safar\Desktop\HACKATHON2\ehr-backend && npm start"

echo.
echo 4. Waiting for EHR Server to start...
timeout /t 5 /nobreak > nul

echo.
echo 5. Running system test...
C:/Users/safar/Desktop/HACKATHON2/.venv/Scripts/python.exe test_ai_backend.py

echo.
echo ======================================================
echo System Started Successfully!
echo ======================================================
echo.
echo AI Backend: http://127.0.0.1:8001
echo EHR System: http://localhost:5000
echo.
echo Press any key to exit...
pause > nul