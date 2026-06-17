@echo off
title AstroPrecise — Schedule free traffic posts
cd /d "C:\Users\jonny\OneDrive\astroprecise"
echo.
echo === AstroPrecise social scheduler ===
echo.
postiz auth:status 2>nul | findstr /i "authenticated" >nul
if errorlevel 1 (
  echo Step 1: Log in to Postiz ^(browser opens^)...
  echo Connect Pinterest, X, Reddit in the Postiz dashboard.
  postiz auth:login
  if errorlevel 1 pause & exit /b 1
)
echo.
echo Step 2: Scheduling pins + posts...
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\schedule-free-traffic.ps1"
echo.
pause