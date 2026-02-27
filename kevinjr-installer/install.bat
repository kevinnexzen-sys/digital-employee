@echo off
echo.
echo ========================================
echo    KEVINJR INSTALLATION FOR WINDOWS
echo ========================================
echo.
echo Installing KevinJr - Your AI Companion
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo 1. Go to https://nodejs.org
    echo 2. Download and install the LTS version
    echo 3. Restart your command prompt
    echo 4. Run this installer again
    echo.
    pause
    exit /b 1
)

echo [INFO] Node.js found! Proceeding with installation...
echo.

REM Create KevinJr directory
if not exist "C:\KevinJr" (
    echo [INFO] Creating KevinJr directory...
    mkdir "C:\KevinJr"
)

REM Copy files
echo [INFO] Copying KevinJr files...
xcopy /E /I /Y "kevinjr-package\*" "C:\KevinJr\"

REM Install dependencies
echo [INFO] Installing dependencies...
cd "C:\KevinJr"
call npm install

REM Create desktop shortcut
echo [INFO] Creating desktop shortcut...
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%temp%\shortcut.vbs"
echo sLinkFile = "%USERPROFILE%\Desktop\KevinJr Dashboard.lnk" >> "%temp%\shortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%temp%\shortcut.vbs"
echo oLink.TargetPath = "C:\KevinJr\start-kevinjr.bat" >> "%temp%\shortcut.vbs"
echo oLink.WorkingDirectory = "C:\KevinJr" >> "%temp%\shortcut.vbs"
echo oLink.Description = "KevinJr AI Assistant Dashboard" >> "%temp%\shortcut.vbs"
echo oLink.Save >> "%temp%\shortcut.vbs"
cscript /nologo "%temp%\shortcut.vbs"
del "%temp%\shortcut.vbs"

REM Create start menu entry
if not exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\KevinJr" (
    mkdir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\KevinJr"
)
copy "C:\KevinJr\start-kevinjr.bat" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\KevinJr\KevinJr Dashboard.bat"

echo.
echo ========================================
echo    INSTALLATION COMPLETE!
echo ========================================
echo.
echo KevinJr has been installed successfully!
echo.
echo To start KevinJr:
echo 1. Double-click the "KevinJr Dashboard" shortcut on your desktop
echo 2. Or run: C:\KevinJr\start-kevinjr.bat
echo 3. Your browser will open automatically to the dashboard
echo.
echo KevinJr will be available at: http://localhost:3001
echo.
pause

