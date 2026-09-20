@echo off
REM ===========================================================================
REM RENDA HUD - OPRESTE auto-update-ul pe disc.
REM Sterge task-ul Windows "RENDA HUD AutoUpdate" (cel care aduce la 10 minute
REM versiunile noi din GitHub in folderul extensiei). Extensia ramane instalata
REM si functionala, la versiunea de acum. Repornirea auto-update-ului: ruleaza
REM din nou remote_install.bat.
REM Sigur de rulat oricand: daca task-ul nu exista, nu face nimic.
REM ===========================================================================
schtasks /Delete /TN "RENDA HUD AutoUpdate" /F >nul 2>nul
if %errorlevel%==0 (
  echo Task-ul "RENDA HUD AutoUpdate" a fost STERS. Auto-update-ul pe disc e oprit.
) else (
  echo Task-ul "RENDA HUD AutoUpdate" nu exista pe acest calculator - nimic de oprit.
)
echo.
pause
