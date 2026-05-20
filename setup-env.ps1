# =====================================================================
# setup-env.ps1
# Script interactivo para configurar las credenciales de Supabase
# en .env.local sin tener que editar nada a mano.
#
# Uso desde PowerShell:
#   cd C:\Users\pitre\OneDrive\Documentos\Claude\Projects\Turnos\pyralis-app
#   .\setup-env.ps1
# =====================================================================

$ErrorActionPreference = "Stop"

# ----------------------------- Helpers visuales -----------------------------
function Write-Title($text) {
    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "==================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step($number, $text) {
    Write-Host ""
    Write-Host "[$number] $text" -ForegroundColor Yellow
}

function Write-Ok($text) {
    Write-Host "  ✓ $text" -ForegroundColor Green
}

function Write-Warn($text) {
    Write-Host "  ⚠ $text" -ForegroundColor DarkYellow
}

function Read-RequiredValue($prompt, $validatorRegex, $errorMsg) {
    while ($true) {
        Write-Host ""
        Write-Host "  $prompt" -ForegroundColor White
        $value = Read-Host "  >"
        $value = $value.Trim().Trim('"').Trim("'")

        if ([string]::IsNullOrWhiteSpace($value)) {
            Write-Warn "El valor no puede estar vacío. Intentá de nuevo."
            continue
        }

        if ($validatorRegex -and ($value -notmatch $validatorRegex)) {
            Write-Warn $errorMsg
            continue
        }

        return $value
    }
}

# ----------------------------- Inicio del script -----------------------------
Write-Title "Turnova — Configuración inicial"

Write-Host "Este script configura las credenciales de Supabase en .env.local"
Write-Host "Vas a necesitar 3 valores de tu proyecto Supabase. Te abro la pestaña"
Write-Host "correcta en el navegador para que los copies fácil."
Write-Host ""

# ----------------------------- Verificar ubicación -----------------------------
$expectedFiles = @("package.json", ".env.local.example")
$missing = $expectedFiles | Where-Object { -not (Test-Path $_) }

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "  ✗ No estás en la carpeta correcta del proyecto." -ForegroundColor Red
    Write-Host "  Ejecutá primero:" -ForegroundColor Red
    Write-Host "    cd C:\Users\pitre\OneDrive\Documentos\Claude\Projects\Turnos\pyralis-app" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Ok "Estás en la carpeta correcta del proyecto."

# ----------------------------- Detectar archivo previo -----------------------------
if (Test-Path ".env.local") {
    Write-Host ""
    Write-Warn "Ya existe un archivo .env.local"
    $overwrite = Read-Host "  ¿Querés sobrescribirlo? (s/N)"
    if ($overwrite -ne "s" -and $overwrite -ne "S") {
        Write-Host "Cancelado. El archivo .env.local quedó como estaba." -ForegroundColor DarkYellow
        exit 0
    }
}

# ----------------------------- Abrir Supabase en el navegador -----------------------------
Write-Step "1/4" "Abriendo Supabase en tu navegador..."
Write-Host "  Andá a tu proyecto → Settings (engranaje) → API"
Write-Host "  Vas a ver 3 valores: Project URL, anon public, service_role"
Write-Host ""
Start-Process "https://supabase.com/dashboard/projects"

Start-Sleep -Seconds 2
Write-Ok "Navegador abierto."

# ----------------------------- Pedir las 3 credenciales -----------------------------
Write-Step "2/4" "Pegá las 3 credenciales (las copiás de Supabase)"

$supabaseUrl = Read-RequiredValue `
    "Pegá el Project URL (ej: https://abcd1234.supabase.co):" `
    "^https://[a-z0-9]+\.supabase\.co/?$" `
    "Debe ser una URL https://xxx.supabase.co"
Write-Ok "Project URL guardado."

$anonKey = Read-RequiredValue `
    "Pegá la anon public key (empieza con eyJ...):" `
    "^eyJ[a-zA-Z0-9_\-\.]+$" `
    "Debe empezar con 'eyJ' (es un JWT). Sin espacios ni comillas."
Write-Ok "anon key guardada."

$serviceKey = Read-RequiredValue `
    "Pegá la service_role key (también eyJ..., hay que clickear 'Reveal' en Supabase):" `
    "^eyJ[a-zA-Z0-9_\-\.]+$" `
    "Debe empezar con 'eyJ'. Recordá que en Supabase tenés que clickear 'Reveal' para verla."
Write-Ok "service_role key guardada."

# ----------------------------- Construir .env.local -----------------------------
Write-Step "3/4" "Escribiendo .env.local..."

$envContent = @"
# ============ Supabase ============
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_ROLE_KEY=$serviceKey

# ============ Edge Functions ============
NEXT_PUBLIC_EDGE_PROCESAR_PEDIDO=/functions/v1/procesar-pedido
NEXT_PUBLIC_EDGE_ASIGNAR_TURNO=/functions/v1/asignar-turno
NEXT_PUBLIC_EDGE_CONFIRMAR_TURNO=/functions/v1/confirmar-turno
NEXT_PUBLIC_EDGE_CANCELAR_TURNO=/functions/v1/cancelar-turno

# ============ App config ============
NEXT_PUBLIC_APP_NAME=Turnova
NEXT_PUBLIC_APP_URL=http://localhost:3000
"@

# Usar UTF-8 sin BOM para evitar problemas con Next.js
[System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) ".env.local"),
    $envContent,
    (New-Object System.Text.UTF8Encoding $false)
)

Write-Ok ".env.local creado correctamente."

# ----------------------------- Próximos pasos -----------------------------
Write-Step "4/4" "Listo. Ahora podés levantar la app:"

Write-Host ""
Write-Host "  Opción A — Reiniciar dev server ahora mismo:" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Si tenías un 'npm run dev' corriendo antes, frenalo con Ctrl+C primero."
Write-Host ""

$startNow = Read-Host "¿Querés que arranque el dev server ahora? (s/N)"

if ($startNow -eq "s" -or $startNow -eq "S") {
    Write-Host ""
    Write-Host "  → Arrancando 'npm run dev'..." -ForegroundColor Cyan
    Write-Host "  → Cuando veas 'Ready in X seconds', abrí http://localhost:3000"
    Write-Host "  → Para frenarlo, apretá Ctrl+C"
    Write-Host ""
    npm run dev
} else {
    Write-Host ""
    Write-Host "Listo. Cuando quieras, levantá el server con:" -ForegroundColor Green
    Write-Host "  npm run dev" -ForegroundColor Cyan
    Write-Host ""
}
