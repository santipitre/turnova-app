@echo off
REM ============================================================
REM  Deploy Turnova: Claude Opus 4.7 para lectura de pedidos
REM  Commitea modelo + etiquetas UI y pushea a main (Vercel).
REM ============================================================
cd /d "%~dp0"

echo.
echo == Cambios pendientes ==
git status --short

echo.
echo == Commiteando ==
git add -A
git commit -m "feat(ia): Claude Opus 4.7 para lectura de pedidos medicos + etiquetas UI"

echo.
echo == Push a main (dispara redeploy en Vercel) ==
git push origin main

echo.
echo == Listo. Revisa el deploy en https://vercel.com ==
pause
