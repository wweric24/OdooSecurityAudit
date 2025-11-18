# Prerequisites Installation Script for Odoo Security Audit
# This script checks for and installs Python 3.11+ and Node.js 18+

$ErrorActionPreference = "Stop"

Write-Host "=== Odoo Security Audit - Prerequisites Installation ===" -ForegroundColor Cyan
Write-Host ""

# Check for Chocolatey
$chocoAvailable = $false
try {
    $chocoVersion = choco --version 2>$null
    if ($chocoVersion) {
        $chocoAvailable = $true
        Write-Host "Chocolatey detected (version $chocoVersion)" -ForegroundColor Green
    }
} catch {
    $chocoAvailable = $false
}

# Function to check if a command exists
function Test-Command {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Check Python
Write-Host "Checking for Python..." -ForegroundColor Yellow
$pythonInstalled = $false
$pythonVersion = $null

if (Test-Command "python") {
    try {
        $pythonVersion = python --version 2>&1 | Out-String
        $pythonInstalled = $true
        Write-Host "Python found: $pythonVersion" -ForegroundColor Green
    } catch {
        $pythonInstalled = $false
    }
} elseif (Test-Command "py") {
    try {
        $pythonVersion = py --version 2>&1 | Out-String
        $pythonInstalled = $true
        Write-Host "Python found: $pythonVersion" -ForegroundColor Green
    } catch {
        $pythonInstalled = $false
    }
}

if (-not $pythonInstalled) {
    Write-Host "Python 3.11+ is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python 3.11 or later from one of these options:" -ForegroundColor Yellow
    Write-Host "  1. Download from https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host "  2. Install via Microsoft Store (search for 'Python 3.11')" -ForegroundColor Cyan
    if ($chocoAvailable) {
        Write-Host "  3. Install via Chocolatey: choco install python311 -y" -ForegroundColor Cyan
        $installPython = Read-Host "Would you like to install Python 3.11 via Chocolatey now? (Y/N)"
        if ($installPython -eq "Y" -or $installPython -eq "y") {
            Write-Host "Installing Python 3.11 via Chocolatey..." -ForegroundColor Yellow
            choco install python311 -y
            Write-Host "Please restart your PowerShell session after installation." -ForegroundColor Yellow
            exit 0
        }
    }
    Write-Host ""
    Write-Host "After installing Python, please:" -ForegroundColor Yellow
    Write-Host "  1. Restart your PowerShell session" -ForegroundColor Yellow
    Write-Host "  2. Run this script again" -ForegroundColor Yellow
    exit 1
}

# Verify Python version is 3.11+
$pythonVersionNum = $null
if ($pythonVersion -match "Python (\d+)\.(\d+)") {
    $major = [int]$matches[1]
    $minor = [int]$matches[2]
    if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 11)) {
        Write-Host "Python version $major.$minor is installed, but Python 3.11+ is required." -ForegroundColor Red
        Write-Host "Please upgrade to Python 3.11 or later." -ForegroundColor Yellow
        exit 1
    }
}

# Check Node.js
Write-Host ""
Write-Host "Checking for Node.js..." -ForegroundColor Yellow
$nodeInstalled = $false
$nodeVersion = $null

if (Test-Command "node") {
    try {
        $nodeVersion = node --version 2>&1 | Out-String
        $nodeInstalled = $true
        Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
    } catch {
        $nodeInstalled = $false
    }
}

if (-not $nodeInstalled) {
    Write-Host "Node.js 18+ is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js 18 or later from one of these options:" -ForegroundColor Yellow
    Write-Host "  1. Download from https://nodejs.org/ (LTS version recommended)" -ForegroundColor Cyan
    if ($chocoAvailable) {
        Write-Host "  2. Install via Chocolatey: choco install nodejs-lts -y" -ForegroundColor Cyan
        $installNode = Read-Host "Would you like to install Node.js LTS via Chocolatey now? (Y/N)"
        if ($installNode -eq "Y" -or $installNode -eq "y") {
            Write-Host "Installing Node.js LTS via Chocolatey..." -ForegroundColor Yellow
            choco install nodejs-lts -y
            Write-Host "Please restart your PowerShell session after installation." -ForegroundColor Yellow
            exit 0
        }
    }
    Write-Host ""
    Write-Host "After installing Node.js, please:" -ForegroundColor Yellow
    Write-Host "  1. Restart your PowerShell session" -ForegroundColor Yellow
    Write-Host "  2. Run this script again" -ForegroundColor Yellow
    exit 1
}

# Verify Node.js version is 18+
$nodeVersionNum = $null
if ($nodeVersion -match "v(\d+)\.(\d+)") {
    $major = [int]$matches[1]
    if ($major -lt 18) {
        Write-Host "Node.js version $major.x is installed, but Node.js 18+ is required." -ForegroundColor Red
        Write-Host "Please upgrade to Node.js 18 or later." -ForegroundColor Yellow
        exit 1
    }
}

# Check npm
Write-Host ""
Write-Host "Checking for npm..." -ForegroundColor Yellow
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Host "npm found: version $npmVersion" -ForegroundColor Green
} else {
    Write-Host "npm not found. It should come with Node.js." -ForegroundColor Red
    Write-Host "Please reinstall Node.js." -ForegroundColor Yellow
    exit 1
}

# Install Python dependencies
Write-Host ""
Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

if (Test-Path "requirements.txt") {
    $pythonCmd = if (Test-Command "python") { "python" } else { "py" }
    Write-Host "Running: $pythonCmd -m pip install -r requirements.txt" -ForegroundColor Gray
    & $pythonCmd -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install Python dependencies." -ForegroundColor Red
        exit 1
    }
    Write-Host "Python dependencies installed successfully." -ForegroundColor Green
} else {
    Write-Host "requirements.txt not found. Skipping Python dependency installation." -ForegroundColor Yellow
}

# Install Node.js dependencies (frontend)
Write-Host ""
Write-Host "Installing Node.js dependencies (frontend)..." -ForegroundColor Cyan
$frontendDir = Join-Path $repoRoot "app\frontend"
if (Test-Path $frontendDir) {
    if (Test-Path (Join-Path $frontendDir "package.json")) {
        Push-Location $frontendDir
        Write-Host "Running: npm install" -ForegroundColor Gray
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to install Node.js dependencies." -ForegroundColor Red
            Pop-Location
            exit 1
        }
        Write-Host "Node.js dependencies installed successfully." -ForegroundColor Green
        Pop-Location
    } else {
        Write-Host "package.json not found in frontend directory. Skipping Node.js dependency installation." -ForegroundColor Yellow
    }
} else {
    Write-Host "Frontend directory not found. Skipping Node.js dependency installation." -ForegroundColor Yellow
}

# Initialize database
Write-Host ""
Write-Host "Initializing database..." -ForegroundColor Cyan
$pythonCmd = if (Test-Command "python") { "python" } else { "py" }
try {
    & $pythonCmd -c "from app.backend.database import init_db; init_db()"
    Write-Host "Database initialized successfully." -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not initialize database. You may need to run this manually later." -ForegroundColor Yellow
    Write-Host "Error: $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Prerequisites Installation Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run the application with:" -ForegroundColor Cyan
Write-Host "  pwsh -File start_app.ps1" -ForegroundColor White
Write-Host ""

