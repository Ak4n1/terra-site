# Plan Fullstack: Crear Cuenta de Juego (Spring + Angular)

## Objetivo
Implementar ahora (y solo ahora) el flujo completo de creacion de cuenta de juego para Lineage II, integrado entre backend (`terra-api`) y frontend (`Terra-web-v2`), con seguridad, idempotencia y validaciones.

## Repos y limites de trabajo
- Backend: `C:\Users\JeeP_\OneDrive\Escritorio\terra-api-v2\terra-api`
- Frontend: `C:\Users\JeeP_\OneDrive\Escritorio\Terra-web-v2`
- Regla estricta:
  - Tablas del juego (`accounts` y futuras tablas L2): JDBC parametrizado, sin entidades JPA.
  - Tablas nuevas Terra para soporte del flujo: entidades JPA permitidas.

## Arquitectura de paquetes (Spring) para esta fase
```text
src/main/java/com/terra/api/game
  shared/
    infrastructure/encoding/L2ClientPasswordEncoder.java
  accounts/
    api/
      controller/GameAccountController.java
      dto/
    application/
      GameAccountCreationService.java
      GameAccountPasswordService.java
      GameAccountValidationService.java
    domain/
      model/
      exception/
      port/
    infrastructure/
      persistence/
        jpa/   (solo tablas nuevas Terra)
        jdbc/  (tablas del juego, sin JPA)
      mail/
```

Nota: `characters` y otros modulos futuros no se implementan en esta fase.

## Endpoints iniciales (fase cuenta de juego)
- `POST /api/game-accounts/create-code`
  - Requiere sesion master autenticada y email verificado.
  - Genera codigo (6 digitos), guarda hash y expiracion, envia email.
- `POST /api/game-accounts/verify-code`
  - Valida codigo, expiracion e intentos.
  - Devuelve `verificationToken` efimero para habilitar creacion.
- `POST /api/game-accounts`
  - Crea la cuenta del juego en tabla `accounts`.
  - Soporta `Idempotency-Key`.

## Reglas funcionales y de seguridad
- Username de cuenta de juego:
  - Longitud: 4 a 14
  - Patron: `^[A-Za-z0-9_]+$`
- Password de cuenta de juego:
  - Longitud: 8 a 16
  - Debe incluir mayuscula, numero y caracter especial
  - Persistencia en formato L2: `SHA-1 + Base64` (`L2ClientPasswordEncoder`)
- Anti-abuso:
  - Rate limit por endpoint (`create-code`, `verify-code`, `create`)
  - Cooldown por email para reenvio de codigo
  - Maximo de intentos para verificacion de codigo
- Idempotencia:
  - Obligatoria en `POST /api/game-accounts`
  - Misma key + mismo payload -> replay
  - Misma key + payload distinto -> conflicto

## Modelo de datos
- Tabla del juego (existente): `accounts`
  - Operada solo via JDBC parametrizado.
- Tabla nueva Terra (nueva): `game_account_creation_code`
  - Entidad JPA para ciclo de verificacion.
  - Campos minimos:
    - `id`
    - `account_id`
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
- `src/app/features/dashboard/services/game-account-create.service.ts`
- `src/app/features/dashboard/pages/game-accounts/game-accounts.page.ts`
- `src/app/features/dashboard/pages/game-accounts/game-accounts.page.html`
- `src/app/core/i18n/modules/dashboard-game-accounts.translations.ts`

### Regla Atomic
- No se crean nuevos atomos/moleculas/organismos en esta fase.
- Se reutilizan `ui-input-field`, `ui-button`, `ui-verification-code-input`, `ui-alert`, `ui-progress-bar`.
- Toda la orquestacion del flujo queda en la `page` de `features/dashboard`.

### Integracion HTTP real
- Reemplazar mock del servicio por llamadas:
  - `POST /api/game-accounts/create-code`
  - `POST /api/game-accounts/verify-code`
  - `POST /api/game-accounts`
- Tipar respuestas con `ApiResponse<T>`.
- En `create-account`, enviar `Idempotency-Key` generado por submit (UUID).

### Estado de flujo en la page
- Paso 1: enviar codigo al email de la cuenta master logueada.
- Paso 2: validar codigo y guardar `verificationToken` en memoria de la page.
- Paso 3: crear cuenta con `accountName`, `password`, `verificationToken`.
- Si se reinicia el flujo (`reset`), limpiar `verificationToken` y formulario completo.

### Manejo de errores y mensajes
- `400`: codigo invalido/expirado o validacion de campos.
- `401/403`: sesion invalida o email master no verificado.
- `409`: nombre de cuenta ya existe o conflicto de idempotencia.
- `429`: rate limit/cooldown; mostrar `retryAfterSeconds` cuando venga en respuesta.
- Mapear mensajes a i18n del modulo `dashboard-game-accounts`.

## Fases de implementacion
1. **Fase 1 - Estructura**
   - Crear paquete `game` y subpaquetes `accounts`, `shared`.
2. **Fase 2 - Backend cuenta de juego**
   - DTOs, controller, servicios, repos JPA/JDBC, validaciones, mail.
   - Integrar rate limit, cooldown e idempotencia.
3. **Fase 3 - Frontend flujo real**
   - Integrar endpoints en servicio y pantalla de dashboard.
   - Estados de carga, mensajes y errores.
4. **Fase 4 - Pruebas y hardening**
   - Tests unitarios/integracion backend.
   - Verificacion manual end-to-end en frontend.
   - Validacion de logs y comportamiento final.

## Plan de testing
- Backend:
  - Flujo feliz completo `create-code -> verify-code -> create-account`.
  - Codigo invalido/expirado.
  - Username existente.
  - Reuso idempotente y conflicto por payload distinto.
  - Rate limit, cooldown, intentos maximos.
- Frontend:
  - Navegacion por pasos.
  - Errores y mensajes por estado.
  - Prevencion de doble submit.

## Criterio de aceptacion
- El flujo completo funciona desde UI hasta DB del juego.
- `accounts` se opera sin entidades JPA.
- La tabla de soporte nueva usa JPA sin afectar tablas del juego.
- Idempotencia y controles anti-abuso activos.
- Queda base limpia para sumar futuros flujos (`change password`, `my characters`) sin implementarlos ahora.
