# Plan Fullstack: Cambio de Contrasena de Cuenta de Juego (Spring + Angular)

## Objetivo
Implementar el flujo completo de cambio de contrasena de cuenta de juego (Lineage II), integrado entre backend (`terra-api`) y frontend (`Terra-web-v2`), con validaciones, seguridad y controles anti-abuso.

## Repos y limites de trabajo
- Backend: `C:\Users\JeeP_\OneDrive\Escritorio\terra-api-v2\terra-api`
- Frontend: `C:\Users\JeeP_\OneDrive\Escritorio\Terra-web-v2`
- Regla de datos del juego:
  - Tabla `accounts` y tablas L2: acceso por JDBC parametrizado.
  - Tablas de soporte Terra para el flujo: se permite JPA.

## Alcance funcional (esta fase)
- El usuario autenticado selecciona una cuenta de juego propia.
- Solicita codigo de verificacion por email (cuenta master).
- Verifica codigo de 6 digitos.
- Cambia la contrasena de la cuenta de juego.
- Visualiza estados de carga, mensajes y errores por paso.

Fuera de alcance en esta fase:
- Seccion Foro/Support real (solo placeholders en frontend).
- Cambio de email master.
- Cambios masivos de password.

## Arquitectura de paquetes (Spring) sugerida
```text
src/main/java/com/terra/api/game
  accounts/
    api/
      controller/
      dto/
    application/
      GameAccountPasswordChangeService.java
      GameAccountPasswordPolicyService.java
    domain/
      model/
      exception/
      port/
    infrastructure/
      persistence/
        jdbc/   (tabla accounts)
        jpa/    (tabla de codigos/verificacion si aplica)
      mail/
  shared/
    infrastructure/encoding/L2ClientPasswordEncoder.java
```

## Endpoints propuestos (password change)
- `GET /api/game-accounts`
  - Requiere sesion autenticada.
  - Devuelve solo cuentas de juego asociadas al master logueado.
  - Fuente: tabla `accounts` (JDBC).

- `GET /api/game-accounts/{accountName}/characters` (opcional en esta fase)
  - Requiere sesion autenticada.
  - Devuelve personajes de la cuenta seleccionada si aplica en UI.
  - Ownership obligatorio (la cuenta debe pertenecer al master logueado).

- `POST /api/game-accounts/change-password/code`
  - Requiere sesion autenticada.
  - Envia codigo de verificacion al email master.
  - Aplica cooldown y rate-limit.

- `POST /api/game-accounts/change-password/verify`
  - Valida codigo, expiracion e intentos.
  - Retorna `verificationToken` efimero para habilitar el cambio.

- `POST /api/game-accounts/change-password`
  - Cambia password de una cuenta de juego del usuario autenticado.
  - Requiere `verificationToken` valido.
  - Opcional recomendado: `Idempotency-Key`.

## Reglas de negocio y seguridad
- Ownership estricto:
  - Solo se permite cambiar password de cuentas asociadas al master logueado.
  - `GET /api/game-accounts` y endpoint de personajes deben filtrar por master autenticado.
- Codigo de verificacion:
  - 6 digitos, expiracion corta (ej: 10 min), intentos maximos (ej: 5).
- Politica de password:
  - Longitud: 8 a 16.
  - Al menos una mayuscula, un numero y un caracter especial.
  - Confirmacion `newPassword == confirmPassword` en frontend y backend.
- Persistencia password L2:
  - `SHA-1 + Base64` mediante `L2ClientPasswordEncoder`.
- Anti-abuso:
  - Rate-limit por endpoint (`code`, `verify`, `change`).
  - Cooldown por email/cuenta para reenvio.

## Modelo de datos
- Tabla del juego (existente): `accounts`
  - Actualizacion de `password` via JDBC parametrizado.
- Tabla de soporte Terra (si no existe ya para este flujo):
  - `game_account_password_change_code`
  - Campos minimos sugeridos:
    - `id`
    - `account_id`
    - `master_account_id`
    - `email`
    - `code_hash`
    - `expires_at`
    - `attempt_count`
    - `verified_at`
    - `consumed_at`
    - `verification_token_hash`
    - `created_at`
    - `updated_at`

## Frontend (Angular) plan detallado y Atomic Design
### Alcance de archivos
- `src/app/features/dashboard/services/game-account-change-password.service.ts`
- `src/app/features/dashboard/pages/change-password/change-password.page.ts`
- `src/app/features/dashboard/pages/change-password/change-password.page.html`
- `src/app/core/i18n/modules/dashboard-change-password.translations.ts`

### Flujo UI por pasos
0. Paso `load-accounts`
- Cargar desde backend las cuentas de juego del master autenticado (`GET /api/game-accounts`).
- Si no hay cuentas, mostrar estado vacio y no habilitar flujo de cambio.
- (Opcional) Cargar personajes de cuenta seleccionada con endpoint dedicado.

1. Paso `send-email`
- Seleccion de cuenta (proveniente del backend) y envio de codigo.
- Boton deshabilitado durante request.

2. Paso `verify-code`
- Ingreso de codigo (6 digitos).
- Manejo de codigo invalido/expirado/intentos agotados.

3. Paso `change-password`
- Ingreso de `newPassword` y `confirmPassword`.
- Validaciones locales antes de enviar.

4. Paso `done`
- Confirmacion visual y opcion de reiniciar flujo.

### Integracion HTTP real
- Reemplazar mock actual por llamadas a backend.
- Mapear `ApiResponse<T>` y errores normalizados.
- Mostrar `retryAfterSeconds` si viene en errores 429.
- No enviar email desde frontend; backend lo toma desde la sesion master.

## Contratos de error sugeridos
- `400`: validacion de campos, codigo invalido/expirado.
- `401/403`: sesion invalida o cuenta no autorizada.
- `404`: cuenta de juego inexistente.
- `409`: conflicto de estado (codigo ya consumido, token invalido).
- `429`: rate-limit/cooldown.

## Fases de implementacion
1. **Fase 1 - Contrato y backend base**
- Definir DTOs, endpoints y codigos de error.
- Implementar `GET /api/game-accounts` (y `.../characters` si entra en esta fase).
- Implementar servicios de envio/verificacion de codigo.

2. **Fase 2 - Cambio de password backend**
- Implementar update de password en `accounts` via JDBC.
- Integrar politicas de password y ownership.

3. **Fase 3 - Frontend real (sin mock)**
- Conectar `change-password.page` a endpoints reales.
- Ajustar estados de carga, mensajes y errores.

4. **Fase 4 - Hardening y QA**
- Pruebas unitarias/integracion backend.
- Pruebas manuales end-to-end frontend.
- Revisar logs, trazabilidad y limites anti-abuso.

## Plan de testing
- Backend:
  - Listado de cuentas del master (`GET /api/game-accounts`) con ownership correcto.
  - (Opcional) listado de personajes por cuenta con ownership correcto.
  - Flujo feliz: `code -> verify -> change`.
  - Codigo invalido, expirado, intentos excedidos.
  - Cuenta no asociada al usuario.
  - Password invalida por politica.
  - Cooldown y rate-limit efectivos.

- Frontend:
  - Navegacion correcta entre pasos.
  - Deshabilitado de botones en loading.
  - Mensajes de error por tipo de fallo.
  - Reset del flujo limpia estado sensible.

## Criterio de aceptacion
- Flujo completo operativo desde dashboard hasta DB del juego.
- Sin uso de JPA sobre tablas de juego.
- Validaciones y controles anti-abuso activos.
- UX clara en estados de exito, error y reintento.
- Queda base lista para conectar Foro/Support reales mas adelante.

## Dudas para cerrar en la siguiente iteracion
- Confirmar nombres finales de endpoints.
- Confirmar si `Idempotency-Key` sera obligatorio en `change-password`.
- Confirmar reutilizacion de tabla de codigos existente vs tabla nueva dedicada.
- Confirmar politica final de password (longitud/reglas exactas).
