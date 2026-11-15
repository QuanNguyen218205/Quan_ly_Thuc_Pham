@echo off
chcp 65001 >nul
title Quan Ly Thuc Pham - Desktop Server (Port 5173)
cd /d "%~dp0"
cls

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ======================================================================
    echo [LOI] May tinh cua ban CHUA CAI DAT Node.js!
    echo Vui long tai va cai dat Node.js (ban LTS) tai: https://nodejs.org
    echo Sau khi cai xong, hay mo lai file nay.
    echo ======================================================================
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo ======================================================================
    echo Phat hien lan dau tien khoi dong (chua co thu vien node_modules).
    echo Dang tu dong chay 'npm install' de cai dat thu vien, vui long doi...
    echo ======================================================================
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo.
        echo [LOI] Khong the cai dat thu vien. Vui long kiem tra ket noi mang!
        pause
        exit /b 1
    )
)

echo ======================================================================
echo   DANG KHOI DONG DESKTOP SERVER TAI HTTP://LOCALHOST:5173
echo   (Trinh duyet se tu dong mo len trong giay lat...)
echo   Luu y: Giu nguyen cua so nay khi dang xem giao dien!
echo ======================================================================
echo.

start "" "http://localhost:5173"
call npm run dev:desktop

if %ERRORLEVEL% neq 0 (
    echo.
    echo [CHU Y] Ung dung da dung lai hoac gap su co khi khoi dong.
    pause
)
