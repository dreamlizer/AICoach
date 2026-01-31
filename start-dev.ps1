# AI Coach Launcher
# ==========================================

# 1. Check Node.js
Write-Host "[1/4] Checking Node.js..." -NoNewline
try {
    $nodeVersion = node -v 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " Found ($nodeVersion)" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host " Not found!" -ForegroundColor Red
    Write-Host "`n[!] Critical: Node.js is missing." -ForegroundColor Yellow
    Write-Host "Downloading Node.js installer..." -ForegroundColor Cyan
    
    $installerUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $installerPath = Join-Path $PSScriptRoot "node-installer.msi"
    
    try {
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
        Write-Host "Download complete. Starting installer..." -ForegroundColor Green
        Write-Host "Please click 'Next' in the installer window." -ForegroundColor Yellow
        Start-Process -FilePath $installerPath -Wait
        
        Write-Host "Installation complete. Please RESTART your computer and run this script again." -ForegroundColor Magenta
        Read-Host "Press Enter to exit..."
        exit
    } catch {
        Write-Host "Download failed. Please install Node.js manually from nodejs.org." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit
    }
}

# 2. Check Project Directory
$frontendDir = Join-Path $PSScriptRoot "frontend"
if (-not (Test-Path $frontendDir)) {
    Write-Host "[Error] 'frontend' directory not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit
}

Set-Location $frontendDir

# 3. Check Dependencies
Write-Host "`n[2/4] Checking dependencies..." 
$nextBin = Join-Path "node_modules" ".bin\next.cmd"
if (-not (Test-Path "node_modules") -or -not (Test-Path $nextBin)) {
    Write-Host "Dependencies incomplete or missing. Installing..." -ForegroundColor Yellow
    try {
        npm config set registry https://registry.npmmirror.com
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        Write-Host "Dependencies installed!" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install dependencies. Check your internet connection." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit
    }
} else {
    Write-Host "Dependencies ready." -ForegroundColor Gray
}

# 4. Initialize Database
Write-Host "`n[3/4] Initializing database..."
$seedScript = Join-Path "scripts" "seed-history.mjs"
if (Test-Path $seedScript) {
    try {
        node $seedScript
        Write-Host "Database initialized." -ForegroundColor Green
    } catch {
        Write-Host "Warning: Database init failed, but ignoring." -ForegroundColor Yellow
    }
}

# 5. Start Server
Write-Host "`n[4/4] Starting server..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Browser should open http://localhost:3000 automatically."
Write-Host "   Please DO NOT close this window."
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Use cmd /c to run npm, which resolves the .cmd extension issue on Windows
try {
    $devProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -NoNewWindow -PassThru
} catch {
    Write-Host "Error starting npm via cmd.exe. Trying direct npm.cmd..." -ForegroundColor Yellow
    $devProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -NoNewWindow -PassThru
}

Start-Sleep -Seconds 5

Start-Process "http://localhost:3000"

if ($devProcess) {
    $devProcess.WaitForExit()
} else {
    Read-Host "Failed to start server. Press Enter to exit..."
}
