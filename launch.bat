@echo off
title AstroPrecise — Local Preview
cd /d "%~dp0website"

REM The server runs in its own minimized window so closing the launcher
REM never kills it. If :8790 is already being served, the extra instance
REM exits immediately and the browser still opens fine.
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
