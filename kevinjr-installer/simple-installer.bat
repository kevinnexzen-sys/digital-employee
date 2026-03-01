@echo off
title KevinJr Installer
color 0A

echo.
echo ===============================================
echo    KevinJr - Advanced AI Development Assistant
echo ===============================================
echo.
echo Welcome! This will install KevinJr on your computer.
echo.
echo What this installer does:
echo - Checks for Node.js (installs if needed)
echo - Creates KevinJr folder at C:\KevinJr
echo - Installs all dependencies
echo - Creates desktop shortcut
echo - Launches KevinJr dashboard
echo.
pause

echo.
echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js not found. Please install Node.js from https://nodejs.org
    echo After installing Node.js, run this installer again.
    pause
    exit /b 1
) else (
    echo ✓ Node.js is installed
)

echo.
echo [2/5] Creating installation directory...
if not exist "C:\KevinJr" mkdir "C:\KevinJr"
echo ✓ Directory created at C:\KevinJr

echo.
echo [3/5] Copying KevinJr files...
xcopy /E /I /Y "kevinjr-package\*" "C:\KevinJr\"
echo ✓ Files copied successfully

echo.
echo [4/5] Installing dependencies...
cd /d "C:\KevinJr"
call npm install
if %errorlevel% neq 0 (
    echo ✗ Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ Dependencies installed

echo.
echo [5/5] Creating desktop shortcut...
echo @echo off > "%USERPROFILE%\Desktop\KevinJr.bat"
echo title KevinJr Dashboard >> "%USERPROFILE%\Desktop\KevinJr.bat"
echo cd /d "C:\KevinJr" >> "%USERPROFILE%\Desktop\KevinJr.bat"
echo start http://localhost:3001 >> "%USERPROFILE%\Desktop\KevinJr.bat"
echo node dashboard/server/dashboard-server.js >> "%USERPROFILE%\Desktop\KevinJr.bat"
echo ✓ Desktop shortcut created

echo.
echo ===============================================
echo    KevinJr Installation Complete! 🎉
echo ===============================================
echo.
echo KevinJr has been installed successfully!
echo.
echo To start KevinJr:
echo 1. Double-click "KevinJr.bat" on your desktop
echo 2. OR open your browser to http://localhost:3001
echo.
echo Voice Training: http://localhost:3001/voice-training.html
echo.
echo Your AI companion is ready! 🤖💙
echo.
pause

echo.
echo Would you like to start KevinJr now? (Y/N)
set /p choice=
if /i "%choice%"=="Y" (
    echo Starting KevinJr...
    start http://localhost:3001
    cd /d "C:\KevinJr"
    node dashboard/server/dashboard-server.js
)

echo.
echo Thank you for installing KevinJr! 🚀
pause
