# Start Backend
Write-Host "Starting Backend..." -ForegroundColor Cyan
Start-Job -ScriptBlock {
    Set-Location "c:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\server"
    node index.js
} -Name "Backend" | Out-Null

Start-Sleep -Seconds 4

# Start Frontend  
Write-Host "Starting Frontend..." -ForegroundColor Cyan
Start-Job -ScriptBlock {
    Set-Location "c:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\client"
    npm run dev
} -Name "Frontend" | Out-Null

Start-Sleep -Seconds 3

Write-Host "`n✅ Services started!" -ForegroundColor Green
Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "`nTo view logs: Get-Job | Receive-Job" -ForegroundColor Yellow
Write-Host "To stop: Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Yellow
