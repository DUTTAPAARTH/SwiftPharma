param(
    [string]$ApiKey
)

if ($ApiKey -and $ApiKey.Trim().Length -gt 0) {
    $env:API_KEY = $ApiKey
}

if (-not $env:API_KEY) {
    Write-Host "ERROR: API_KEY environment variable is not set." -ForegroundColor Red
    Write-Host "Set it and re-run, e.g.:" -ForegroundColor Yellow
    Write-Host '  $env:API_KEY="<your_key>"; ./start-testsprite.ps1' -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting TestSprite MCP..." -ForegroundColor Cyan
npx -y @testsprite/testsprite-mcp@latest
