@echo off
title Cyber Management
echo Starting Cyber Management...
echo.

echo Clearing ports 3001 and 5160...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5160 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
timeout /t 1 /nobreak >nul

start "Backend Server" cmd /k "npm run server:dev"
timeout /t 2 /nobreak >nul
start "Frontend Dev" cmd /k "npm run dev"

echo.
echo  Backend:  http://localhost:3001
echo  Frontend: http://localhost:5160
echo.
pause
