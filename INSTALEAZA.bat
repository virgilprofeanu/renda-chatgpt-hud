@echo off
REM Dublu-click = instaleaza tot: task de auto-update + deschide Chrome pe
REM pagina de extensii, cu calea folderului deja in clipboard.
REM Urmeaza instructiunile afisate in fereastra (3 clickuri in Chrome).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
pause
