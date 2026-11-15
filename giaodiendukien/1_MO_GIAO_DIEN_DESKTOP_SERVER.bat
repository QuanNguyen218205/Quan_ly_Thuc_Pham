@echo off
title Quan Ly Thuc Pham - Desktop Server (Port 5173)
cd /d "%~dp0"
if exist "desktop-server" (
    cd desktop-server
) else (
    cd ..\desktop-server
)
echo ========================================================
echo   DANG KHOI DONG DESKTOP SERVER TAI HTTP://LOCALHOST:5173
echo ========================================================
start http://localhost:5173
npm run dev
