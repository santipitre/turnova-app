# Setup rápido — Solo 3 acciones

Para arrancar Turnova por primera vez en tu PC, hacé estos 3 pasos. Nada de editar archivos a mano.

---

## 1️⃣ Crear tu usuario en Supabase Auth (si todavía no lo hiciste)

1. Andá a https://supabase.com/dashboard
2. Click en tu proyecto Turnova
3. En el menú izquierdo: **Authentication** → **Users** → **Add user** → **Create new user**
4. Email: tu email (ej: `santiagopitrella@gmail.com`)
5. Password: la contraseña que querés usar para entrar a la app
6. ✅ Tildá **"Auto Confirm User"**
7. Click **Create user**

---

## 2️⃣ Crear tu perfil en la base de datos

1. En Supabase, click en **SQL Editor** (menú izquierdo) → **New Query**
2. Abrí el archivo `setup-profile.sql` que está en esta carpeta y copiá todo el contenido
3. Pegalo en el SQL Editor
4. **Si tu email NO es `santiagopitrella@gmail.com`**, editá la línea que dice `v_user_email := 'santiagopitrella@gmail.com';` con tu email real
5. Click **RUN**
6. Deberías ver `NOTICE: Perfil creado correctamente`

---

## 3️⃣ Configurar la app y arrancarla

En PowerShell, pegá estos 2 comandos:

```powershell
cd C:\Users\pitre\OneDrive\Documentos\Claude\Projects\Turnos\pyralis-app

.\setup-env.ps1
```

El script va a:
- Abrirte Supabase en el navegador en la pestaña correcta
- Pedirte los 3 valores (Project URL + anon key + service_role)
- Escribir el archivo `.env.local` automáticamente
- Preguntarte si arrancás el dev server

**Si te pregunta "ExecutionPolicy"**: PowerShell por defecto bloquea scripts. Para permitirlo, pegá primero este comando y respondé "S" cuando pregunte:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Después corré el script de nuevo.

---

## ¡Listo!

Cuando veas en la terminal `Ready in X seconds`, abrí http://localhost:3000 y entrá con el email/password que usaste en el paso 1.

Si algo falla, copiá el mensaje de error y avisame.
