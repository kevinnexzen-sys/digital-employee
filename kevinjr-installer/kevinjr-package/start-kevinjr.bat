@echo off
title KevinJr AI Assistant
echo.
echo ========================================
echo    STARTING KEVINJR AI ASSISTANT
echo ========================================
echo.
echo Initializing KevinJr...
echo Dashboard will open in your browser automatically
echo.

REM Start KevinJr dashboard server
start /B node dashboard/server/dashboard-server.js

REM Wait a moment for server to start
timeout /t 3 /nobreak >nul

REM Open browser to dashboard
start http://localhost:3001

echo.
echo KevinJr Dashboard is now running!
echo Access it at: http://localhost:3001
echo.
echo To stop KevinJr, close this window.
echo.
pause

