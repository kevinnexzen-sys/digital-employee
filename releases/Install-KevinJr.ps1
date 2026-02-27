# KevinJr PowerShell Installer
# Advanced Task Automation Agent Installation Script

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "    KevinJr - Advanced AI Development Assistant" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️  This installer requires Administrator privileges." -ForegroundColor Yellow
    Write-Host "   Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "🚀 Starting KevinJr installation..." -ForegroundColor Green
Write-Host ""

# Step 1: Check Node.js
Write-Host "[1/6] Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org" -ForegroundColor Red
    Write-Host "   After installing Node.js, run this installer again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 2: Create installation directory
Write-Host ""
Write-Host "[2/6] Creating installation directory..." -ForegroundColor Yellow
$installPath = "C:\KevinJr"
if (-not (Test-Path $installPath)) {
    New-Item -ItemType Directory -Path $installPath -Force | Out-Null
}
Write-Host "✅ Directory created at $installPath" -ForegroundColor Green

# Step 3: Download KevinJr ZIP package
Write-Host ""
Write-Host "[3/6] Downloading KevinJr package..." -ForegroundColor Yellow
$zipUrl = "https://github.com/kevinnexzen-sys/digital-employee/raw/codegen-artifacts-store/releases/KevinJr-Windows-Installer.zip"
$zipPath = "$env:TEMP\KevinJr-Windows-Installer.zip"

try {
    Write-Host "   Downloading from GitHub..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    
    # Check file size
    $fileSize = (Get-Item $zipPath).Length
    if ($fileSize -lt 1000000) {  # Less than 1MB indicates incomplete download
        throw "Download incomplete - file size too small: $fileSize bytes"
    }
    
    Write-Host "✅ Downloaded successfully ($([math]::Round($fileSize/1MB, 2)) MB)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download KevinJr package: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 4: Extract ZIP package
Write-Host ""
Write-Host "[4/6] Extracting KevinJr files..." -ForegroundColor Yellow
try {
    $extractPath = "$env:TEMP\KevinJr-Extract"
    if (Test-Path $extractPath) {
        Remove-Item $extractPath -Recurse -Force
    }
    
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $extractPath)
    
    # Copy files to installation directory
    $sourceFiles = Get-ChildItem "$extractPath\kevinjr-package" -Recurse
    $fileCount = $sourceFiles.Count
    
    Copy-Item "$extractPath\kevinjr-package\*" -Destination $installPath -Recurse -Force
    
    Write-Host "✅ Extracted $fileCount files successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to extract files: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 5: Install dependencies
Write-Host ""
Write-Host "[5/6] Installing dependencies..." -ForegroundColor Yellow
try {
    Set-Location $installPath
    Write-Host "   Running npm install (this may take a few minutes)..." -ForegroundColor Cyan
    
    $npmOutput = npm install 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    } else {
        throw "npm install failed: $npmOutput"
    }
} catch {
    Write-Host "❌ Failed to install dependencies: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 6: Create desktop shortcut
Write-Host ""
Write-Host "[6/6] Creating desktop shortcut..." -ForegroundColor Yellow
try {
    $shortcutPath = "$env:USERPROFILE\Desktop\KevinJr.bat"
    $shortcutContent = @"
@echo off
title KevinJr Dashboard
cd /d "C:\KevinJr"
start http://localhost:3001
node dashboard/server/dashboard-server.js
"@
    
    Set-Content -Path $shortcutPath -Value $shortcutContent
    Write-Host "✅ Desktop shortcut created" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not create desktop shortcut: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Cleanup
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue

# Installation complete
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "    KevinJr Installation Complete! 🎉" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "KevinJr has been installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To start KevinJr:" -ForegroundColor White
Write-Host "1. Double-click 'KevinJr.bat' on your desktop" -ForegroundColor White
Write-Host "2. OR open your browser to http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Voice Training: http://localhost:3001/voice-training.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your AI companion is ready! 🤖💙" -ForegroundColor Green
Write-Host ""

# Ask to start KevinJr
$startNow = Read-Host "Would you like to start KevinJr now? (Y/N)"
if ($startNow -eq "Y" -or $startNow -eq "y") {
    Write-Host ""
    Write-Host "🚀 Starting KevinJr..." -ForegroundColor Green
    Start-Process "http://localhost:3001"
    Set-Location "C:\KevinJr"
    node dashboard/server/dashboard-server.js
}

Write-Host ""
Write-Host "Thank you for installing KevinJr! 🚀" -ForegroundColor Cyan
Read-Host "Press Enter to exit"