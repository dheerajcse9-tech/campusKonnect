# CampusKonnect installer for Windows 10/11.
#
# Installs Node.js and Git (if missing) with winget, downloads the project,
# installs everything it needs (including a private PostgreSQL database),
# fills in demo data and starts the app in your browser.
#
# Run in PowerShell:
#   powershell -ExecutionPolicy Bypass -File install-windows.ps1

$ErrorActionPreference = 'Stop'
$RepoUrl = 'https://github.com/dheerajcse9-tech/campusKonnect.git'
$Branch = 'claude/awesome-archimedes-e97y6b'

function Have($Command) { [bool](Get-Command $Command -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Step($Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }

Step 'Checking Node.js and Git'
$needNode = -not (Have 'node')
if (-not $needNode) {
  $major = [int]((node -v).TrimStart('v').Split('.')[0])
  if ($major -lt 20) { $needNode = $true }
}
if (($needNode -or -not (Have 'git')) -and -not (Have 'winget')) {
  Write-Host 'winget is not available. Install "App Installer" from the Microsoft Store,' -ForegroundColor Yellow
  Write-Host 'or install Node.js LTS (https://nodejs.org) and Git (https://git-scm.com) yourself, then run this again.' -ForegroundColor Yellow
  exit 1
}
if ($needNode) {
  Write-Host 'Installing Node.js LTS...'
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  Refresh-Path
}
if (-not (Have 'git')) {
  Write-Host 'Installing Git...'
  winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
  Refresh-Path
}
Write-Host "Node.js $(node -v), $(git --version)"

Step 'Getting the CampusKonnect code'
$insideRepo = (Test-Path 'package.json') -and ((Get-Content 'package.json' -Raw) -match '"name": "campuskonnect"')
if (-not $insideRepo) {
  if (-not (Test-Path 'campusKonnect')) { git clone --branch $Branch $RepoUrl campusKonnect }
  Set-Location 'campusKonnect'
}
Write-Host "Project folder: $(Get-Location)"

Step 'Installing libraries (first time: a few minutes)'
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }

Step 'Setting up the database and demo data'
npm run setup
if ($LASTEXITCODE -ne 0) { throw 'Setup failed' }

Step 'Starting CampusKonnect (press Ctrl+C to stop)'
Write-Host 'Next time, open this folder in a terminal and run:  npm run dev' -ForegroundColor Green
npm run dev
