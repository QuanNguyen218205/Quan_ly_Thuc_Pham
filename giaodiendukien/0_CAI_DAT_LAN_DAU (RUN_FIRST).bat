@echo off
chcp 65001 >nul
title Cai Dat Thu Vien - Quan Ly Thuc Pham
cd /d "%~dp0"
cls
echo ======================================================================
echo          HE THONG QUAN LY THUC PHAM - CAI DAT LAN DAU
echo ======================================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LOI] May tinh cua ban CHUA CAI DAT Node.js!
    echo.
    echo Vui long truy cap https://nodejs.org de tai va cai dat ban Node.js LTS.
    echo Sau khi cai xong, hay mo lai file nay.
    echo.
    pause
    exit /b 1
)

echo [1/2] Kiem tra Node.js: OK
node -v
echo.

echo [2/2] Dang tien hanh cai dat cac thu vien (npm install)...
echo Qua trinh nay mat khoang 1-2 phut tuy toc do mang cua ban.
echo Vui long doi den khi co thong bao hoan tat...
echo.

call npm install

if %ERRORLEVEL% equ 0 (
    echo.
    echo ======================================================================
    echo   [THANH CONG] Da cai dat xong toan bo thu vien!
    echo   Bay gio ban co the nhap dup vao:
    echo     - 1_MO_GIAO_DIEN_DESKTOP_SERVER.bat (De mo Desktop Server)
    echo     - 2_MO_GIAO_DIEN_MOBILE_CLIENT.bat  (De mo Mobile Client)
    echo     - 3_MO_CA_HAI_GIAO_DIEN.bat         (De mo ca 2 ung dung)
    echo ======================================================================
) else (
    echo.
    echo [LOI] Qua trinh cai dat gap su co. Vui long kiem tra lai ket noi mang.
)

echo.
pause
