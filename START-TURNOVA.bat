@echo off
title Turnova - Dev Server
cd /d "%~dp0"
echo.
echo ====================================
echo   TURNOVA - Iniciando dev server
echo ====================================
echo.
echo Proyecto: %CD%
echo.
echo Si pide instalar dependencias por primera vez,
echo el primer arranque puede tardar 1-2 minutos.
echo.
echo Cuando veas "Ready in X.Xs" abri:
echo   http://localhost:3000
echo.
echo Para apagarlo: Ctrl+C
echo ====================================
echo.
call npm run dev
pause
