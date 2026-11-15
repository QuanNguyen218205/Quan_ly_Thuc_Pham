@echo off
title Quan Ly Thuc Pham - Mo Ca Hai Ung Dung
cd /d "%~dp0"
echo Dang mo ca 2 ung dung Desktop Server va Mobile Client...
start "" cmd /c "%~dp01_MO_GIAO_DIEN_DESKTOP_SERVER.bat"
start "" cmd /c "%~dp02_MO_GIAO_DIEN_MOBILE_CLIENT.bat"
