# Plan de Implementación — JWT Security Best Practices (5 puntos)

## Objetivo
Aplicar en `terra-api` + `realtime` estas 5 prácticas:

1. No PII en JWT  
2. No confiar ciegamente en `alg`  
3. Validar `iss` y `aud`  
4. Mantener tokens de vida corta  
5. No usar JWT como sesión (session state en servidor + token opaco)

---

## Estado actual (resumen)

- ✅ JWT actual no incluye email/phone/address, pero sí `sub` (accountId), `type`, `ver`, `iat`, `exp`.
- ⚠️ Firma válida con clave server-side, pero sin policy explícita de `alg` allowlist.
- ❌ No se validan `iss` y `aud`.
- 🟡 Access token es corto en dev, pero necesitamos política formal por entorno.
- ❌ Se usa refresh JWT como parte de sesión (a migrar a refresh opaco).
- ✅ Ya existe `AccountSessionService` y hash de refresh en DB (base útil para migración).

---

## Arquitectura objetivo

- **Access token:** JWT corto (autorización), con claims mínimos.
- **Refresh token:** **opaco aleatorio**, HttpOnly cookie, validado contra sesión en DB.
- **Sesión:** controlada por `account_session` (server-side), no por JWT.
- **Realtime handshake:** valida JWT corto + sesión opaca activa + `tokenVersion`.

---

## Fase 1 — Hardening JWT sin romper clientes (PR1)

### Cambios
- Definir contrato JWT v2:
  - Claims permitidos: `sub`, `jti`, `type`, `ver`, `iat`, `exp`, `iss`, `aud`
  - Prohibido agregar PII extra.
- Agregar validación estricta de:
  - `alg` permitido (allowlist)
  - `iss` esperado
  - `aud` esperado (API y WS)
- Centralizar policy de validación en `JwtService`.
- Telemetría/logs por motivo de rechazo: `invalid_alg`, `invalid_iss`, `invalid_aud`, `expired`.

### Config propuesta
- `jwt.issuer`
- `jwt.audience.api`
- `jwt.audience.realtime`
- `jwt.allowed-algorithms` (si aplica según librería/pattern de validación)

### Criterio de aceptación
- Tokens sin `iss/aud` o con valores incorrectos son rechazados.
- Realtime también rechaza tokens con `aud` incorrecta.

---

## Fase 2 — Tokens de vida corta + rotación robusta (PR2)

### Cambios
- Formalizar TTL por entorno:
  - `access`: 5–10 min (prod)
  - `refresh`: migrando a opaco (Fase 3)
- Mantener rotación en cada `/auth/refresh`.
- Endurecer detección de replay en refresh (reuso de refresh revocado/rotado).

### Criterio de aceptación
- Access expira rápido y el refresh renueva sin fricción.
- Reuso de refresh viejo => invalidación + respuesta controlada.

---

## Fase 3 — Migración a refresh opaco (PR3, núcleo del punto 5)

### Cambios
- Generar refresh opaco criptográficamente aleatorio.
- Guardar **hash** del refresh opaco en `account_session` (sin persistir raw token).
- `AuthController`:
  - `/login`: emite access JWT + refresh opaco (cookie)
  - `/refresh`: lookup por hash, valida sesión activa, rota refresh opaco, reemite access
  - `/logout` y `/logout-all`: invalidan sesiones opacas
- Actualizar `AccountSessionService` para flujo opaco.
- Ajustar `RealtimeAuthenticationService` para leer refresh opaco en handshake.

### Compatibilidad
- Ventana dual temporal:
  - aceptar refresh JWT legado y refresh opaco nuevo
  - al primer refresh legado válido, migrar a opaco

### Criterio de aceptación
- Sesión depende de estado server-side.
- JWT deja de ser el ancla de sesión.

---

## Fase 4 — Limpieza y endurecimiento final (PR4)

### Cambios
- Eliminar soporte legado refresh JWT.
- Revisar cookies en prod:
  - `HttpOnly=true`, `Secure=true`, `SameSite=Lax/Strict` según necesidad
- Preparar runbook de rotación de secretos/keys.
- Opcional: migrar firma a RS256/ES256 (issuer/validator desacoplado).

### Criterio de aceptación
- Solo existe flujo opaco para refresh/sesión.
- Validación JWT consistente en API y WS.

---

## Pruebas (backend + e2e)

### Unit/Integration
- JWT inválido por `alg`, `iss`, `aud`.
- JWT expirado.
- Refresh opaco válido, rotación correcta.
- Replay de refresh revocado.
- `tokenVersion` mismatch tras cambio/reset de password.
- `logout-all` revoca todas sesiones.
- WS handshake rechaza sesión inválida.

### E2E
- Login + 2FA + trusted device.
- Refresh transparente con access expirado.
- Cambio/reset password => cierre de sesiones + reconexión controlada.
- Realtime se corta al revocar sesión.

---

## Riesgos y mitigación

- **Riesgo:** romper sesiones actuales en despliegue.
  - **Mitigación:** ventana dual + feature flag + rollback.
- **Riesgo:** fricción por TTL corto.
  - **Mitigación:** refresh silencioso estable.
- **Riesgo:** inconsistencias realtime.
  - **Mitigación:** tests handshake + revocación + observabilidad.

---

## Orden recomendado de ejecución

1. PR1: `iss/aud/alg` + policy JWT  
2. PR2: TTL y hardening refresh/replay  
3. PR3: refresh opaco + migración dual  
4. PR4: limpieza legado + endurecimiento final  

---

## Definición de “Done”

- Las 5 prácticas están cubiertas técnicamente.
- Realtime y auth comparten validaciones coherentes.
- No hay regresiones de login/2FA/trusted-device/reset-password.
- Observabilidad suficiente para operar en prod.
