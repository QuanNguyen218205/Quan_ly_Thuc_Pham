@echo off
title Quan Ly Thuc Pham - Mobile Client (Port 5174)
cd /d "%~dp0"
if exist "mobile-client" (
    cd mobile-client
) else (
    cd ..\mobile-client
)
echo ========================================================
echo   DANG KHOI DONG MOBILE CLIENT TAI HTTP://LOCALHOST:5174
echo   (Nen mo DevTools F12 va chuyen che do Mobile 390x844)
echo ========================================================
start http://localhost:5174
npm run dev
