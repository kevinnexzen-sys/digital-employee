@echo off
echo ========================================
echo PersonalClaw Windows Build Script
echo ========================================
echo.

echo [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Building Windows executable...
call npm run build-win
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Build complete!
echo.
echo Your .exe file is in the 'dist' folder
echo.
pause
