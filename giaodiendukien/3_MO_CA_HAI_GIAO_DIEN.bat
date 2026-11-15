@echo off
chcp 65001 >nul
title Quan Ly Thuc Pham - Mo Ca Hai Ung Dung
cd /d "%~dp0"
cls

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LOI] May tinh cua ban CHUA CAI DAT Node.js! Vui long tai tai https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Dang tu dong cai dat thu vien lan dau (npm install)...
    call npm install
)

echo Dang mo song song ca Desktop Server (5173) va Mobile Client (5174)...
start "" cmd /c "%~dp01_MO_GIAO_DIEN_DESKTOP_SERVER.bat"
start "" cmd /c "%~dp02_MO_GIAO_DIEN_MOBILE_CLIENT.bat"
