# Refresh PATH environment variable in current session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "PATH refreshed. Testing Python and Node.js..." -ForegroundColor Cyan
python --version
node --version

