# AI Coach Launcher
# ==========================================

function Set-DreamLabWindowTitle {
    try {
        $Host.UI.RawUI.WindowTitle = "Dream Lab Dev Forge"
    } catch {
        # Ignore hosts that do not allow changing the console title.
    }

    try {
        [Console]::Title = "Dream Lab Dev Forge"
    } catch {
        # Ignore hosts that do not allow changing the console title.
    }
}

Set-DreamLabWindowTitle

try {
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
} catch {
    # Ignore hosts that do not allow changing console encoding.
}

# 1. Check Node.js
Write-Host "[1/3] Checking Node.js..." -NoNewline
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

# 2.5. Clean stale dev artifacts / stale port owner
Write-Host "`n[2.5/3] Cleaning stale dev cache and port..." -ForegroundColor Cyan
try {
    $listeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($listeners) {
        $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $pids) {
            if ($pid -and $pid -ne $PID) {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "Stopped existing process on :3000 (PID $pid)." -ForegroundColor Yellow
            }
        }
    }
} catch {
    Write-Host "Port check skipped." -ForegroundColor DarkGray
}

if (Test-Path ".next") {
    try {
        Remove-Item -LiteralPath ".next" -Recurse -Force -ErrorAction Stop
        Write-Host "Removed stale .next cache." -ForegroundColor Gray
    } catch {
        Write-Host "Could not remove .next cache (will continue)." -ForegroundColor DarkGray
    }
}

# 2. Check Dependencies
Write-Host "`n[2/3] Checking dependencies..." 
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

# 3. Start Server (auto-restart guard)
Write-Host "`n[3/3] Starting server..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Browser should open http://localhost:3000 automatically."
Write-Host "   Please DO NOT close this window."
Write-Host "   If dev server exits unexpectedly, it will auto-restart."
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$browserOpened = $false

while ($true) {
    Write-Host "[dev] launching Next.js dev server..." -ForegroundColor Gray
    Set-DreamLabWindowTitle

    if (-not $browserOpened) {
        # Give the server a moment to bind the port before opening the browser.
        Start-Job -ScriptBlock {
            Start-Sleep -Seconds 3
            Start-Process "http://localhost:3000"
        } | Out-Null
        $browserOpened = $true
    }

    # Pipe output through PowerShell so framework title control sequences do not
    # directly reach the terminal tab, then keep restoring our preferred title.
    $esc = [char]27
    & cmd.exe /d /s /c "chcp 65001>nul && npm.cmd run dev 2>&1" | ForEach-Object {
        $line = "$_"
        $line = $line -replace "$esc\][^\a$esc]*(\a|$esc\\)", ""
        [Console]::WriteLine($line)
        Set-DreamLabWindowTitle
    }
    $exitCode = $LASTEXITCODE
    Set-DreamLabWindowTitle

    if ($exitCode -eq 0) {
        Write-Host "[dev] server exited (code 0). Restarting in 2 seconds..." -ForegroundColor Yellow
    } else {
        Write-Host "[dev] server exited unexpectedly (code $exitCode). Restarting in 2 seconds..." -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 2
}
