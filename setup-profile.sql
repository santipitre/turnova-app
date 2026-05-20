-- =====================================================================
-- setup-profile.sql
-- Crea tu perfil de superadmin en Turnova
-- =====================================================================
-- INSTRUCCIONES:
-- 1. Antes de ejecutar esto, ya tenés que haber creado tu usuario en
--    Supabase Authentication → Users → "Add user" con tu email/contraseña.
-- 2. Después, ejecutá ESTE script completo en SQL Editor de Supabase.
-- 3. Te crea el perfil que la app necesita para que funcione.
-- =====================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_user_email TEXT;
BEGIN
    -- ⚠️ REEMPLAZAR este email por el tuyo (el que creaste en Auth)
    v_user_email := 'santiagopitrella@gmail.com';

    -- Buscar el usuario creado en Authentication
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_user_email
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró un usuario con el email %. Creá primero el usuario en Authentication → Users.', v_user_email;
    END IF;

    -- Buscar el tenant (asumiendo que ya cargaste datos demo)
    SELECT id INTO v_tenant_id
    FROM public.tenants
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No hay tenants en la base. Cargá primero los datos demo (Turnova_DatosDemo.sql).';
    END IF;

    -- Crear o actualizar el perfil
    INSERT INTO public.profiles (id, tenant_id, nombre, email, rol)
    VALUES (v_user_id, v_tenant_id, 'Santiago Pitrella', v_user_email, 'superadmin')
    ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        rol = 'superadmin',
        activo = true;

    RAISE NOTICE 'Perfil creado correctamente:';
    RAISE NOTICE '  User ID:   %', v_user_id;
    RAISE NOTICE '  Tenant ID: %', v_tenant_id;
    RAISE NOTICE '  Rol:       superadmin';
    RAISE NOTICE '';
    RAISE NOTICE 'Ya podés entrar a la app con % y tu contraseña.', v_user_email;
END $$;
