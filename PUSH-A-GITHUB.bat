@echo off
REM ============================================================
REM  Turnova App - Initial commit y push al repo santipitre/turnova-app
REM  Doble click una sola vez para subir todo el codigo a GitHub.
REM ============================================================
setlocal

cd /d "%~dp0"

echo.
echo === Turnova App - Push inicial a GitHub ===
echo Carpeta: %CD%
echo.

REM 1. Verificar que git este instalado
git --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: git no esta instalado o no esta en el PATH.
  echo Instala Git desde https://git-scm.com/download/win
  pause
  exit /b 1
)

REM 2. Inicializar repo si no existe
if not exist ".git" (
  echo [1/6] Inicializando git repo...
  git init
  git branch -M main
) else (
  echo [1/6] Repo ya inicializado.
)

REM 2.5 Verificar que .env.local NO se va a subir
if exist ".env.local" (
  findstr /B /C:".env*.local" .gitignore >nul
  if errorlevel 1 (
    echo WARNING: .env.local existe pero .gitignore no lo excluye.
    echo Agregando .env.local al gitignore por seguridad...
    echo .env*.local>> .gitignore
  )
)

REM 3. Agregar remoto
echo.
echo [2/6] Configurando remoto origin...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/santipitre/turnova-app.git

REM 4. Add
echo.
echo [3/6] Agregando archivos...
git add -A

REM 5. Verificar que NO estamos subiendo .env.local
git status --short | findstr ".env.local" >nul
if not errorlevel 1 (
  echo.
  echo *** ALERTA DE SEGURIDAD ***
  echo .env.local fue agregado al commit. Esto incluye la ANTHROPIC_API_KEY.
  echo Abortando para que no se filtre. Revisa el .gitignore.
  git reset HEAD .env.local 2>nul
  pause
  exit /b 1
)

REM 6. Commit
echo.
echo [4/6] Creando commit inicial...
git -c user.email=santiagopitrella@gmail.com -c user.name="Santiago Pitrella" commit -m "feat: Turnova app inicial" -m "Next.js 14 + Supabase Lumen + Claude Vision" -m "- Login PIN compartido con Lumen/Dictom (cookie turnova_session)" -m "- /pedidos/nuevo: upload de pedidos medicos con drag and drop" -m "- /api/procesar-pedido: extraccion IA con Claude Vision" -m "- Dashboard, cupos, obras sociales, turnos, configuracion" -m "- Schema turnova.* en Supabase erjdncsnomwymjiaslpx (Lumen)"

REM 7. Push
echo.
echo [5/6] Pushing a GitHub...
git push -u origin main
if errorlevel 1 (
  echo.
  echo ERROR en el push. Posibles causas:
  echo  - Credenciales GitHub no configuradas
  echo  - Repo ya tiene contenido (haz `git pull --rebase origin main` y reintenta)
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  Push completado. Codigo subido a:
echo  https://github.com/santipitre/turnova-app
echo.
echo  PROXIMO PASO: Ir a Vercel para conectar el repo.
echo  Te voy a guiar desde Chrome cuando me digas que terminaste.
echo ============================================================
echo.
pause
