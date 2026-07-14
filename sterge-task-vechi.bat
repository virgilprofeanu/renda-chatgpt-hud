@echo off
REM ===========================================================================
REM RENDA HUD - curatare mecanism VECHI de auto-update.
REM Versiunile initiale ale extensiei foloseau un task Windows ("RENDA HUD
REM Extension AutoUpdate") + update.ps1 ca sa aduca versiunile noi pe disc.
REM Extensia se actualizeaza acum SINGURA, din browser (chrome.userScripts),
REM deci task-ul nu mai are niciun rost. Dublu-click pe acest fisier il sterge.
REM Sigur de rulat oricand: daca task-ul nu exista, nu face nimic.
REM ===========================================================================
schtasks /Delete /TN "RENDA HUD Extension AutoUpdate" /F >nul 2>nul
if %errorlevel%==0 (
  echo Task-ul vechi "RENDA HUD Extension AutoUpdate" a fost STERS. Curat.
) else (
  echo Task-ul vechi nu exista pe acest calculator - nimic de curatat.
)
echo.
echo Extensia se actualizeaza acum singura, din browser. Nu mai e nevoie de nimic.
echo.
pause
