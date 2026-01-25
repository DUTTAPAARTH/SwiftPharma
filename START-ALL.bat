@echo off
echo Killing all node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo.
echo Starting Backend Server...
cd /d "c:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\server"
start "SwiftPharma Backend" cmd /k "npx nodemon index.js"

timeout /t 5 >nul

echo.
echo Starting Frontend...
cd /d "c:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\client"
start "SwiftPharma Frontend" cmd /k "npm run dev"

echo.
echo ✅ Both servers started!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
pause
