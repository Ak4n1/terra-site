# Auth/CSRF Hardening Checklist (Terra)

## Objetivo
Cerrar los riesgos de autenticación/cookies/CSRF antes de arrancar nuevas funcionalidades.

## Preparación
1. Levantar `terra-api` en `dev`.
2. Levantar `Terra-web-v2` en `localhost:4200`.
3. Abrir una sesión limpia (incógnito).
4. Tener `ak logs spring` visible para correlacionar errores.

## Smoke base
1. Login correcto.
Resultado esperado: `auth.login_success`, cookies `access`, `refresh`, `XSRF-TOKEN`.
2. `GET /api/auth/me` responde usuario.
3. Logout correcto y cookies limpiadas.

## Rotación de sesión
1. Forzar expiración de access (esperar 1 minuto en `dev`).
2. Ejecutar acción mutante (ej: `verify-code`, `create-code`, `preferred-language`).
Resultado esperado: refresh automático y request original exitosa.

## CSRF recuperación
1. Login.
2. Invalidar/desfasar CSRF (esperar refresh o manipular estado en otra pestaña).
3. Ejecutar request mutante.
Resultado esperado: el cliente recupera CSRF (`/api/auth/config`) y reintenta una vez.
4. Verificar que no quede loading infinito en UI.

## Concurrencia multi-pestaña
1. Abrir 2 pestañas con sesión activa.
2. En pestaña A ejecutar operación que rote sesión.
3. En pestaña B ejecutar request mutante.
Resultado esperado: o se recupera y continúa, o muestra error de sesión claro (sin bucle).

## Refresh token inválido/revocado
1. Revocar sesión (`logout-all` o reset password).
2. Intentar request mutante desde pestaña vieja.
Resultado esperado: cierre de sesión controlado y mensaje claro, sin retry infinito.

## Rate limit
1. Spamear login incorrecto.
Resultado esperado: `rate_limit.exceeded`.
2. Spamear `create-code`.
Resultado esperado: `game.create_code_cooldown_active` y/o `rate_limit.exceeded`, con `retryAfterSeconds`.

## Game account flow específico
1. Enviar código.
2. Verificar código correcto.
3. Volver atrás y reenviar.
Resultado esperado: no error CSRF; si hay cooldown, mensaje correcto.
4. Crear cuenta con token verificado.
Resultado esperado: éxito y token/código consumido.

## No-regresiones obligatorias
1. Forgot/reset password.
2. Verify email.
3. Change preferred language.
4. Logout y logout-all.
Resultado esperado: sin `auth.invalid_csrf_token` espurio.

## Señales de que está “cerrado”
1. No hay loops de retry.
2. No hay “Verificando...” infinito.
3. Error de sesión/csrf siempre entendible para el usuario.
4. Tests de integración auth verdes en CI.
