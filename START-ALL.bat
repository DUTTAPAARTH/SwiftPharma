@echo off
setlocal

cd /d "%~dp0"
title SwiftPharma Dev Runner

echo ================================================================
echo SwiftPharma Dev Runner
echo SERVER: http://localhost:5000
echo CLIENT: http://localhost:5173
echo Logs stay in this window. If either process fails, you will see it here.
echo Press Ctrl+C to stop both services.
echo ================================================================
echo.

call npm run dev
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
	echo SwiftPharma dev runner exited with code %EXIT_CODE%.
) else (
	echo SwiftPharma dev runner stopped.
)

endlocal & exit /b %EXIT_CODE%
