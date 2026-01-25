param(
    [switch]$NoMongo,
    [switch]$NoServer
)

# Paths
$repoRoot = "C:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA"
$mongoRoot = "C:\mongodb-portable"
$dataPath  = "C:\data\db"
$logPath   = "C:\data\db\mongod.log"
$serverDir = Join-Path $repoRoot "server"

# Ensure data directory exists
if (-not (Test-Path $dataPath)) {
    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
}

# Start MongoDB if requested
if (-not $NoMongo) {
    $mongodRunning = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
    if ($mongodRunning) {
        Write-Host "MongoDB already running (PID: $($mongodRunning.Id -join ', '))."
    } else {
        $mongodExe = Get-ChildItem -Path $mongoRoot -Filter "mongod.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
        if (-not $mongodExe) {
            Write-Host "mongod.exe not found under $mongoRoot. Please verify MongoDB portable install." -ForegroundColor Red
            exit 1
        }
        Write-Host "Starting MongoDB from: $mongodExe"
        Start-Process -FilePath $mongodExe -ArgumentList "--dbpath=$dataPath","--logpath=$logPath","--logappend" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        Write-Host "MongoDB started."
    }
}

# Start API server if requested
if (-not $NoServer) {
    Write-Host "Starting SwiftPharma API (npm run dev)..."
    Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory $serverDir -WindowStyle Normal
    Write-Host "API launch command issued."
}
