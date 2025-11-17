Param(
    [int]$FrontendPort = 3100,
    [int]$BackendPort = 3200
)

$ErrorActionPreference = "Stop"

function Get-PortProcesses {
    param([int]$Port)
    try {
        return Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
        return @()
    }
}

function Stop-PortProcesses {
    param([int]$Port)
    $pids = Get-PortProcesses -Port $Port
    foreach ($processId in $pids) {
        try {
            Write-Host "Stopping process $processId listening on port $Port..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
            Write-Warning ("Failed to stop process {0}: {1}" -f $processId, $_)
        }
    }
}

function Wait-ForPort {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 60
    )
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        $pids = Get-PortProcesses -Port $Port
        if ($pids.Count -gt 0) {
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$backendDir = Join-Path $repoRoot "app\backend"
$frontendDir = Join-Path $repoRoot "app\frontend"

Write-Host "Ensuring no processes are listening on backend port $BackendPort..."
Stop-PortProcesses -Port $BackendPort
Write-Host "Ensuring no processes are listening on frontend port $FrontendPort..."
Stop-PortProcesses -Port $FrontendPort

Write-Host "Starting backend (FastAPI) on port $BackendPort..." -ForegroundColor Cyan
$backendCommand = "Set-Location '$repoRoot'; python -m uvicorn app.backend.api:app --host 0.0.0.0 --port $BackendPort --reload"
$backendProcess = Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", $backendCommand -PassThru

if (Wait-ForPort -Port $BackendPort -TimeoutSeconds 90) {
    Write-Host "Backend is running on port $BackendPort (PID $($backendProcess.Id))." -ForegroundColor Green
} else {
    Write-Warning "Backend did not start within the expected time. Check the backend window for details."
}

Write-Host "Ensuring frontend dependencies are installed..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Push-Location $frontendDir
    try {
        npm install
    } finally {
        Pop-Location
    }
}

Write-Host "Starting frontend (Vite) on port $FrontendPort..." -ForegroundColor Cyan
$frontendCommand = "Set-Location '$frontendDir'; npm run dev -- --host 0.0.0.0 --port $FrontendPort"
$frontendProcess = Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", $frontendCommand -PassThru

if (Wait-ForPort -Port $FrontendPort -TimeoutSeconds 90) {
    Write-Host "Frontend is running on port $FrontendPort (PID $($frontendProcess.Id))." -ForegroundColor Green
} else {
    Write-Warning "Frontend did not start within the expected time. Check the frontend window for details."
}

Write-Host "`nBoth services were launched. Backend: http://localhost:$BackendPort  Frontend: http://localhost:$FrontendPort" -ForegroundColor Magenta
