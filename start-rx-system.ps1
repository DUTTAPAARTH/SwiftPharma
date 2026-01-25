#!/usr/bin/env powershell
# SwiftPharma RX System Startup Script
# Starts MongoDB, API server, and frontend dev server

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  SwiftPharma RX System - Startup Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Start MongoDB from portable
Write-Host ""
Write-Host "Starting MongoDB (portable)..." -ForegroundColor Yellow
$mongod = Get-ChildItem -Path "C:\mongodb-portable" -Filter "mongod.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if ($mongod) {
    Start-Process -FilePath $mongod -ArgumentList "--dbpath=C:\data\db","--logpath=C:\data\db\mongod.log","--logappend" -WindowStyle Hidden
    Write-Host "OK - MongoDB started" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "SKIP - MongoDB not found" -ForegroundColor Yellow
}

# Start API server in new window
Write-Host ""
Write-Host "Starting API server..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\server'; node index.js"
Write-Host "OK - API server started" -ForegroundColor Green
Write-Host "    http://localhost:5000/health" -ForegroundColor Cyan

# Wait for API to be ready
Write-Host ""
Write-Host "Waiting for API to be ready..." -ForegroundColor Yellow
$maxAttempts = 10
$attempt = 0
while ($attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "OK - API is ready" -ForegroundColor Green
            break
        }
    } catch {
        $attempt++
        if ($attempt -eq $maxAttempts) {
            Write-Host "WAIT - API took time to start. Check server window." -ForegroundColor Yellow
        } else {
            Start-Sleep -Seconds 1
        }
    }
}

# Start Frontend dev server in new window
Write-Host ""
Write-Host "Starting Frontend dev server..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\client'; npm run dev"
Write-Host "OK - Frontend started" -ForegroundColor Green
Write-Host "    http://localhost:5173" -ForegroundColor Cyan

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  All systems running!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  API:       http://localhost:5000" -ForegroundColor White
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  Health:    http://localhost:5000/health" -ForegroundColor White

Write-Host ""
Write-Host "Test the RX System:" -ForegroundColor Yellow
Write-Host "  1. Go to http://localhost:5173" -ForegroundColor White
Write-Host "  2. Sign up for an account" -ForegroundColor White
Write-Host "  3. Browse to Amoxicillin 500 or Metformin 500 (RX products)" -ForegroundColor White
Write-Host "  4. Upload a prescription image" -ForegroundColor White
Write-Host "  5. Add to cart and checkout" -ForegroundColor White
Write-Host "  6. Review prescriptions in Admin panel" -ForegroundColor White

Write-Host ""
Write-Host "Tip: Press Ctrl+C in any window to stop services" -ForegroundColor Gray
Write-Host "Type 'exit' to close a terminal window" -ForegroundColor Gray

Write-Host ""
