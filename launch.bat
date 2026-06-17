@echo off
title AstroPrecise — Local Preview
cd /d "%~dp0website"

REM The server runs in its own minimized window so closing the launcher
REM never kills it. Prefer Node gzip preview; fall back to Python.
where node >nul 2>&1 && (
  start "AstroPrecise server :8790" /MIN node tools\serve-preview.mjs 8790
  goto :open
)

where py >nul 2>&1     && goto :server_py
where python >nul 2>&1 && goto :server_python
where python3 >nul 2>&1 && goto :server_python3

echo  Python not found. Opening live site instead...
start "" "https://jonnydavx-eng.github.io/astroprecise/"
exit /b 1

:server_py
start "AstroPrecise server :8790" /MIN py -m http.server 8790
goto :open

:server_python
start "AstroPrecise server :8790" /MIN python -m http.server 8790
goto :open

:server_python3
start "AstroPrecise server :8790" /MIN python3 -m http.server 8790
goto :open

:open
timeout /t 2 /nobreak >nul
start "" "http://localhost:8790"
exit /b 0
