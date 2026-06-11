@echo off
title AstroPrecise — Local Preview
cd /d "%~dp0website"

echo.
echo  AstroPrecise Local Preview
echo  ==========================
echo  Starting server on http://localhost:8420
echo  Press Ctrl+C to stop.
echo.

REM Try py launcher (Python 3 on Windows), then python, then python3
where py >nul 2>&1     && goto :server_py
where python >nul 2>&1 && goto :server_python
where python3 >nul 2>&1 && goto :server_python3

echo  Python not found. Opening live site instead...
start "" "https://jonnydavx-eng.github.io/astroprecise/"
pause
exit /b 1

:server_py
start /b py -m http.server 8420 >nul 2>&1
goto :open

:server_python
start /b python -m http.server 8420 >nul 2>&1
goto :open

:server_python3
start /b python3 -m http.server 8420 >nul 2>&1
goto :open

:open
timeout /t 2 /nobreak >nul
start "" "http://localhost:8420"
echo  Browser opened at http://localhost:8420
echo  Close this window to stop the server.
pause >nul
