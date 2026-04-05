# Plan de Implementacion: Configuracion de Cuenta (Angular + Spring)

## 1. Objetivo

Implementar una seccion completa de configuracion de cuenta en:

- Frontend: `C:\Users\JeeP_\OneDrive\Escritorio\Terra-web-v2` (Angular 21)
- Backend: `C:\Users\JeeP_\OneDrive\Escritorio\terra-api-v2\terra-api` (Spring Boot 4)

Tomando como referencia funcional el proyecto anterior (`portafolio` + `site-ak4n1`), pero mejorando:

1. Recuperacion de acceso de 2FA si el usuario pierde el celular.
2. Registro de actividad sin interceptor HTTP global.
3. Navegacion interna de configuracion basada en rutas hijas (persistente ante `F5`).
4. Gestion de avatar configurable (presets por categoria + upload propio).

---

## 2. Estado actual detectado

### 2.1 Frontend (Terra-web-v2)

- Existe ruta de dashboard para configuracion:
  - `src/app/features/dashboard/routes.ts` -> `path: 'configuration'`
- La pagina esta vacia:
  - `src/app/features/dashboard/pages/configuration/configuration.page.ts`
  - `src/app/features/dashboard/pages/configuration/configuration.page.html`
- El avatar de sesion se elige aleatoriamente en cada contexto:
  - `src/app/features/auth/services/session-avatar.service.ts`
  - Usa `AVATAR_PATHS` hardcodeado + `pickRandomAvatar()`

### 2.2 Backend (terra-api-v2/terra-api)

- Modulo auth bien definido (`api`, `application`, `domain`, `infrastructure`).
- No existe aun modulo de configuracion de cuenta con:
  - 2FA TOTP
  - recovery codes
  - actividad de seguridad de cuenta
  - avatar persistente configurable

---

## 3. Principios de arquitectura

1. **Atomic/feature-first** en frontend:
   - Contenedor shell de configuracion + subpages por concern.
   - Servicios de dominio por feature (security, profile, avatar, activity).

2. **SOLID/Clean-ish** en backend:
   - Casos de uso en `application`.
   - Entidades y reglas en `domain`.
   - Persistencia y web en `infrastructure/api`.

3. **Sin interceptor global para activity log**:
   - Logging explicito en casos de uso de seguridad.
   - Mejor trazabilidad y menor ruido.

4. **Security by design**:
   - Recovery codes de un solo uso y hasheados.
   - Rate limit y anti-bruteforce en desafios 2FA.
   - Validaciones fuertes de upload de avatar.

---

## 4. UX y navegacion (resuelve F5)

### 4.1 Rutas propuestas Angular

Mantener `/dashboard/configuration` como shell y agregar rutas hijas:

- `/dashboard/configuration/profile`
- `/dashboard/configuration/security`
- `/dashboard/configuration/activity`
- `/dashboard/configuration/avatar`

Comportamiento:

- `configuration` redirige a `configuration/profile`.
- Tabs de mini navegacion con `routerLink` (no signal local de steps).
- El contenido cambia en `<router-outlet>` interno del shell.
- Al refrescar (`F5`) permanece la sub-seccion exacta.

### 4.2 Estructura sugerida (frontend dentro de `features/dashboard`)

```text
src/app/features/dashboard/
  routes.ts
  pages/
    configuration/
      configuration.page.ts|html|css             (shell: tabs + router-outlet)
      routes.ts                                  (rutas hijas de configuration)
      pages/
        profile/profile-settings.page.*
        security/security-settings.page.*
        activity/activity-settings.page.*
        avatar/avatar-settings.page.*
      services/
        configuration-api.service.ts
        configuration-security.service.ts
        configuration-avatar.service.ts
        configuration-activity.service.ts
      models/
        configuration.models.ts
        configuration-security.models.ts
        configuration-avatar.models.ts
        configuration-activity.models.ts
```

### 4.3 I18n obligatorio por seccion (sin modulo monolitico)

Regla de implementacion:

- Todas las pantallas de configuracion deben ser traducibles.
- **No** crear un unico modulo gigante tipo `dashboard-configuration.translations.ts`.
- Cada seccion mantiene su propio archivo de traducciones.

Ubicacion base:

- `C:\Users\JeeP_\OneDrive\Escritorio\Terra-web-v2\src\app\core\i18n`

Convencion propuesta de archivos en `src/app/core/i18n/modules/`:

- `dashboard-configuration-profile.translations.ts`
- `dashboard-configuration-security.translations.ts`
- `dashboard-configuration-activity.translations.ts`
- `dashboard-configuration-avatar.translations.ts` (si avatar queda como tab propio)

Integracion:

- Importar cada modulo en:
  - `src/app/core/i18n/locales/es.ts`
  - `src/app/core/i18n/locales/us.ts`
  - `src/app/core/i18n/locales/pt.ts`
  - `src/app/core/i18n/locales/fr.ts`
  - `src/app/core/i18n/locales/de.ts`
- Seguir el patron existente de merge por modulo (`...MODULE_TRANSLATIONS_ES`, etc.).

---

## 5. Alcance funcional por modulo

## 5.1 Perfil

- Visualizar y editar datos permitidos (ej. nombre visible si aplica).
- Campo opcional `username`/`nick` (se completa solo desde Profile).
- `username` **no** se solicita en registro.
- `username` no se muestra publicamente en esta fase (uso interno para secciones futuras).
- La gestion de avatar (presets + custom upload) se implementa en **5.4 Avatar**.

## 5.2 Seguridad

- Cambio de password con validaciones fuertes.
- Estado 2FA (activo/inactivo).
- Activar 2FA (TOTP):
  - generar secreto + QR + clave manual.
  - verificar codigo para confirmar activacion.
- Gestion de dispositivos confiables (si se implementa trust-device).
- Desactivar 2FA con reautenticacion (password actual + OTP/recovery).
- Recovery codes:
  - visualizar una sola vez al generar.
  - regenerar invalida los anteriores.

## 5.3 Actividad

- Timeline de eventos de seguridad de cuenta:
  - login exitoso/fallido
  - password changed
  - 2FA enabled/disabled
  - recovery code usado
  - avatar changed
- Filtros: tipo, rango de fecha, gravedad (opcional), busqueda.
- Paginacion.

## 5.4 Avatar

- Seleccion de presets por categoria (ej: `L2` inicialmente).
- Subida de avatar propio.
- Recorte previo (crop) y compresion en cliente.
- Persistencia de eleccion en backend.
- Reemplazo del sistema aleatorio actual.

---

## 6. Diseno de datos backend (Spring)

## 6.1 Extensiones a `AccountMaster`

Agregar campos:

- `username` (varchar, nullable, unico case-sensitive)
- `twoFactorEnabled` (boolean)
- `twoFactorSecretEncrypted` (varchar)
- `twoFactorEnabledAt` (Instant)
- `twoFactorLastVerifiedAt` (Instant)
- `avatarType` (enum: PRESET|CUSTOM)
- `avatarPresetKey` (varchar, nullable)
- `avatarCustomUrl` (varchar, nullable)

Reglas de negocio para `username`:

- Opcional (puede ser `null`).
- Se actualiza solo desde endpoint de Profile.
- No forma parte del `register`.
- Preservar exactamente el casing ingresado por el usuario (ej. `Ak4n1`).
- `trim()` permitido para limpiar espacios laterales, pero **sin** transformar a lowercase/uppercase.
- Validaciones sugeridas:
  - longitud: 3-24
  - regex: `^[a-zA-Z0-9_.-]+$`
  - unicidad case-sensitive (indice/constraint segun collation de DB).

## 6.2 Nuevas tablas

### `account_recovery_code`

- `id`
- `account_id` (FK)
- `code_hash` (varchar)
- `used` (boolean)
- `used_at` (Instant nullable)
- `created_at` (Instant)
- `expires_at` (Instant nullable, recomendado)

### `account_mfa_challenge`

- `id`
- `account_id` (FK)
- `challenge_id` (uuid/string)
- `expires_at`
- `attempts`
- `max_attempts`
- `fulfilled`
- `created_at`

### `account_activity_log`

- `id`
- `account_id` (FK)
- `type` (varchar)
- `message` (varchar/text)
- `severity` (varchar)
- `ip_address` (varchar)
- `user_agent` (varchar)
- `metadata_json` (json/text)
- `created_at` (Instant)

### `account_avatar_catalog` (opcional, recomendado)

- `id`
- `category` (ej: L2)
- `preset_key` (unique)
- `display_name`
- `asset_url`
- `enabled`
- `sort_order`

---

## 7. API contract propuesto

## 7.1 Perfil

- `GET /api/account/settings/profile`
- `PATCH /api/account/settings/profile`

`PATCH /profile` debe aceptar `username` opcional junto con otros datos de perfil.
Si `username` ya existe (otro usuario), responder conflicto de dominio (ej. `409` con code dedicado).

## 7.2 Seguridad (2FA + recovery)

- `POST /api/account/settings/security/password/change`
- `GET /api/account/settings/security/2fa/status`
- `POST /api/account/settings/security/2fa/setup/init`
- `POST /api/account/settings/security/2fa/setup/verify`
- `POST /api/account/settings/security/2fa/disable`
- `POST /api/account/settings/security/2fa/recovery-codes/regenerate`
- `POST /api/account/settings/security/2fa/recovery-codes/verify` (flujo de recovery login si aplica)

## 7.3 Dispositivos confiables (si activo)

- `GET /api/account/settings/security/trusted-devices`
- `DELETE /api/account/settings/security/trusted-devices/{id}`
- `POST /api/account/settings/security/trusted-devices/revoke-all`

## 7.4 Actividad

- `GET /api/account/settings/activity?type=&from=&to=&page=&size=`

## 7.5 Avatar

- `GET /api/account/settings/avatar`
- `GET /api/account/settings/avatar/presets?category=L2&page=0&size=24`
- `PATCH /api/account/settings/avatar/preset` (body: `presetKey`)
- `POST /api/account/settings/avatar/upload` (multipart)
- `DELETE /api/account/settings/avatar/custom` (vuelve a preset/default)

---

## 8. Flujo 2FA robusto (problema del celular perdido)

## 8.1 Activacion

1. Usuario inicia setup.
2. Backend genera secreto TOTP temporal + QR.
3. Usuario verifica OTP.
4. Se activa 2FA.
5. Se generan recovery codes (ej. 10), se muestran una sola vez.
6. Se almacenan hasheados.

## 8.2 Login normal

1. Email/password correctos.
2. Si 2FA activo y dispositivo no confiable: challenge 2FA.
3. Usuario ingresa OTP.
4. Se emite sesion.

## 8.3 Recovery por perdida de dispositivo

1. Usuario elige "No tengo mi app".
2. Ingresa recovery code.
3. Backend valida hash + unused + no expirado.
4. Marca el recovery code como usado.
5. Permite acceso controlado y forzar:
   - regenerar recovery codes, o
   - reconfigurar 2FA, o
   - desactivar 2FA con confirmacion fuerte.

## 8.4 Reglas de seguridad obligatorias

- Recovery code solo visible completo al momento de generacion.
- Nunca guardar recovery en texto plano.
- Invalida todos los recovery anteriores al regenerar.
- Rate limiting por IP + por cuenta para OTP/recovery.
- Audit log obligatorio para eventos 2FA y recovery.

## 8.5 Estrategia de rate limiting (usar global + especifico)

Decision:

- **Si**, se usan los rate limiters globales existentes como primera linea.
- **Ademas**, para 2FA/recovery/avatar se agregan controles especificos de dominio.

Base existente en backend (ya implementada):

- `RateLimitFilter` (`security/infrastructure/filter/RateLimitFilter.java`)
- `RateLimitProperties` (`security/infrastructure/config/RateLimitProperties.java`)
- `RateLimitService` (token bucket en memoria)
- Respuesta estandar `429` con `Retry-After` + `retryAfterSeconds`.

Como aplicarlo a configuracion de cuenta:

1. Extender `RateLimitProperties` con politicas nuevas:
   - `accountSettingsRead` (lecturas de perfil/actividad)
   - `accountSettingsWrite` (updates de perfil/avatar preset)
   - `twoFactorFlow` (setup/init/verify/disable)
   - `twoFactorRecovery` (recovery code verify/regenerate)
   - `avatarUpload` (upload custom)
2. Mapear endpoints nuevos en `RateLimitFilter.resolvePolicy(...)`.
3. Construir keys robustas en `buildKey(...)`:
   - IP + URI (base)
   - para flujos sensibles: agregar identidad de cuenta/challenge cuando exista.
4. Mantener cooldown/intentos en dominio (como ya se hace en otros flujos):
   - OTP verify: max intentos por challenge + expiracion.
   - Recovery verify: max intentos por ventana + lock temporal.
   - Regenerate recovery codes: cooldown (ej. 60s) para evitar abuso.
5. Para upload de avatar:
   - rate limit dedicado por cuenta + IP.
   - limite de tamano en servidor y reverse proxy.

Principio:

- El filtro global controla presion general del endpoint.
- Las reglas de dominio controlan abuso semantico del caso de uso.
- Ambos deben convivir (no reemplazarse).

---

## 9. Activity log sin interceptor global

## 9.1 Estrategia

Crear un `AccountActivityService` en backend con metodo estilo:

- `log(accountId, type, message, severity, context)`

Y llamarlo explicitamente desde:

- `AuthServiceImpl` (login, logout-all, refresh anomalos, password change)
- Servicios de 2FA
- Servicios de avatar

## 9.2 Beneficios

- No se registra ruido tecnico irrelevante.
- Los mensajes son de dominio (entendibles por usuario).
- Menor acoplamiento que interceptor global.

---

## 10. Avatar: presets por categoria + upload

## 10.1 Presets por categoria

Categoria inicial:

- `L2`

Campos por preset:

- `presetKey` (ej: `L2_HUMAN_M_01`)
- `category` (`L2`)
- `displayName`
- `assetUrl`
- `rarity` (opcional)
- `enabled`

## 10.2 Upload custom

Decision de arquitectura (obligatoria):

- **Presets**: siempre se sirven desde Angular (`Terra-web-v2/public/assets/images/app/avatar`).
- **Custom**: siempre se suben y persisten del lado Spring (filesystem o storage externo).
- El frontend **no** guarda assets custom en `public/`.

Pipeline recomendado:

1. Cliente selecciona imagen.
2. Crop en cliente (aspect ratio 1:1 recomendado).
3. Compresion cliente (webp/jpeg <= 300KB objetivo).
4. Backend valida:
   - extension allowlist
   - MIME real
   - magic bytes/firma
   - size maxima
5. Backend renombra (UUID), almacena, y devuelve URL.

Ubicacion de almacenamiento custom (backend):

- Configurable por propiedad:
  - `app.storage.avatar-dir=C:/Users/JeeP_/OneDrive/Escritorio/terra-api-v2/terra-api/uploads/avatars`
- Estructura sugerida:
  - `uploads/avatars/{accountId}/{uuid}.webp`
- Guardar en DB:
  - `avatarType=CUSTOM`
  - `avatarCustomUrl` (URL de acceso) o `avatarCustomPath` (ruta interna) segun estrategia de serving.

Serving recomendado:

- Opcion A (simple): endpoint Spring para servir avatar custom por id/path validado.
- Opcion B (produccion): servir carpeta via Nginx/CDN, manteniendo validacion y control en upload.

## 10.3 Politica de fallback

- Si no hay avatar custom:
  - usar preset elegido.
- Si no hay preset elegido:
  - usar default estable (no aleatorio por request).

## 10.4 Librerias frontend recomendadas para custom avatar (drag/drop + crop)

Objetivo: UX moderna solo para el flujo de avatar custom.

- Base recomendada:
  - `ngx-image-cropper` para recorte (1:1, zoom, mover, salida `Blob`).
  - `browser-image-compression` para compresion previa al upload.
- Drag and drop:
  - Implementacion nativa Angular (drop zone custom) **o**
  - `filepond` + `filepond-plugin-image-preview` para experiencia visual premium.

Recomendacion del plan:

1. Empezar con `ngx-image-cropper` + drop zone nativo (menos dependencia, rapido de integrar).
2. Si luego queres una UX mas pro, migrar el input/drop a FilePond manteniendo el cropper.

## 10.5 Flujo UX detallado (custom)

1. Usuario abre tab/avatar y elige "Subir personalizado".
2. Arrastra archivo o hace click para seleccionar.
3. Preview + cropper (cuadrado 1:1).
4. Confirmar recorte.
5. Compresion cliente.
6. Upload multipart a backend.
7. Respuesta con URL/avatarVersion.
8. Refrescar estado de sesion/avatar en navbar/sidebar/dashboard.
9. Registrar evento en activity log (`AVATAR_CUSTOM_UPLOADED`).

## 10.6 Reglas de validacion y seguridad (custom upload)

- Limite de tamano request (ej. 5MB raw).
- Tipos permitidos: `image/png`, `image/jpeg`, `image/webp`.
- Verificar magic bytes en backend (no confiar solo en MIME header).
- Nombre final generado por backend (UUID), nunca confiar en nombre original.
- Evitar path traversal.
- Rate limit por cuenta para upload avatar.
- Si se reemplaza avatar custom previo, eliminar/invalidar archivo anterior.
- Registrar eventos:
  - `AVATAR_PRESET_SELECTED`
  - `AVATAR_CUSTOM_UPLOADED`
  - `AVATAR_CUSTOM_REMOVED`

---

## 11. Librerias recomendadas

## 11.1 Angular

- `ngx-image-cropper` para recorte de avatar.
- `browser-image-compression` para compresion previa al upload.
- `filepond` + `filepond-plugin-image-preview` (opcional) para drag/drop premium.

Notas:

- Son compatibles con stack Angular moderno.
- Reducen ancho de banda y tiempo de upload.

## 11.2 Spring/Java

- `dev.samstevens.totp` para TOTP y generacion/verificacion.
- `zxing` (si necesitas control custom de QR) o QR provisto por libreria TOTP elegida.

## 11.3 Seguridad upload

- Basar validaciones en enfoque OWASP File Upload Cheat Sheet.

---

## 12. Plan de implementacion por fases

## Fase 0 - Diseno y contratos (1-2 dias)

- Definir DTOs y contratos endpoint.
- Definir tablas/migraciones SQL.
- Definir mapping de eventos de activity log.
- Definir catalogo inicial de avatar presets (`L2`).
- Definir contrato de `username` opcional (perfil), con validaciones y unicidad.
- Definir estrategia i18n por seccion (archivos separados en `core/i18n/modules`).

Entregables:

- ADR tecnico.
- Documento de contratos API.
- Script de migraciones inicial.

## Fase 1 - Backend base (2-4 dias)

- Crear entidades/repositorios:
  - `account_recovery_code`
  - `account_mfa_challenge`
  - `account_activity_log`
  - avatar fields/catalog
  - `username` opcional en `account_master`
- Servicios:
  - `TwoFactorService`
  - `RecoveryCodeService`
  - `AccountActivityService`
  - `AccountAvatarService`
- Endpoints base de settings.

Entregables:

- API funcional en entorno local.
- Tests unitarios de servicios criticos.

## Fase 2 - Frontend routing + shell (1-2 dias)

- Crear shell `configuration` con mini nav por `routerLink`.
- Agregar rutas hijas y redireccion por default.
- Dejar cada subpage en modo scaffold conectada al API service.
- Crear modulos i18n separados por seccion y registrarlos en cada locale.

Entregables:

- Navegacion persistente con `F5`.
- Estructura feature escalable.

## Fase 3 - Seguridad y 2FA UI (2-3 dias)

- Flujos completos:
  - activar 2FA
  - verificar OTP
  - desactivar 2FA
  - regenerar/mostrar recovery codes
  - trusted devices
- Estados UX:
  - loading/error/success
  - feedback claro por codigo de error

Entregables:

- Flujo 2FA end-to-end.

## Fase 4 - Actividad y avatar (2-3 dias)

- Activity timeline con filtros y paginacion.
- Avatar:
  - presets por categoria `L2`
  - upload + crop + compresion
  - persistencia y reflejo en navbar/sidebar.

Entregables:

- Seccion de configuracion completa.

## Fase 5 - Hardening + QA (2-3 dias)

- Pruebas de seguridad de upload.
- Pruebas anti-bruteforce de 2FA/recovery.
- E2E de rutas hijas y persistencia de navegacion.
- Performance check de imagenes.

Entregables:

- Checklist de release.
- Plan de rollback.

---

## 13. Testing strategy

## 13.1 Backend

- Unit tests:
  - TOTP verification windows
  - recovery code one-time use
  - regeneration invalidates previous codes
  - avatar validation
- Integration tests:
  - login con 2FA
  - login via recovery
  - activity logs generados por casos de uso

## 13.2 Frontend

- Unit tests:
  - guards y routing hijos
  - componentes de formularios de seguridad/avatar
  - resolucion de claves i18n por cada seccion de configuracion
- E2E:
  - `/dashboard/configuration/security` + F5 mantiene vista
  - activar 2FA y usar recovery flow
  - seleccionar preset + subir custom avatar

---

## 14. Riesgos y mitigaciones

1. **Bloqueo de usuarios por 2FA**
   - Mitigacion: recovery codes + flujo guiado + notificaciones.

2. **Upload inseguro**
   - Mitigacion: validacion fuerte backend + limites + almacenamiento controlado.

3. **Acoplamiento frontend/back**
   - Mitigacion: contratos API cerrados antes de implementar UI.

4. **Ruido en logs**
   - Mitigacion: logging explicito por caso de uso, no interceptor global.

5. **Regresion de sesion/autenticacion**
   - Mitigacion: pruebas de auth y smoke tests en login/refresh/logout.

---

## 15. Criterios de aceptacion (Definition of Done)

1. La mini navegacion de configuracion usa rutas hijas y persiste al refrescar.
2. Existe campo `username` opcional en `account_master`, editable solo en Profile y no requerido en Register.
3. El usuario puede activar y desactivar 2FA de forma segura.
4. Existen recovery codes de un solo uso y hasheados.
5. Un usuario que pierde su celular puede recuperar acceso (flujo recovery).
6. Activity logs de seguridad se registran sin interceptor global.
7. El avatar deja de ser aleatorio y pasa a ser:
   - seleccionable por presets categoria `L2`
   - subible por archivo propio
8. Navbar/Sidebar reflejan el avatar persistido.
9. Tests criticos pasan en frontend y backend.
10. Todas las secciones de configuracion tienen i18n completo por modulo separado (sin archivo monolitico).

---

## 16. Backlog tecnico sugerido (tickets)

### Backend

1. Migraciones SQL para `username` + 2FA/recovery/activity/avatar.
2. Implementar `TwoFactorService`.
3. Implementar `RecoveryCodeService`.
4. Implementar `AccountActivityService`.
5. Implementar `AccountAvatarService`.
6. Endpoints `account/settings/*` (incluyendo upload custom multipart y serving).
7. Tests unitarios + integracion.

### Frontend

1. Implementar rutas hijas de `configuration` dentro de `features/dashboard`.
2. Shell con mini nav + router-outlet.
3. Subpagina profile.
4. Subpagina security (2FA + recovery + trusted devices).
5. Subpagina activity.
6. Subpagina avatar (presets Angular + custom upload Spring + drag/drop + crop + compress).
7. Integrar avatar persistido en sidebar/navbar.
8. Tests unitarios + e2e.
9. Crear/registrar archivos i18n por seccion:
   - `dashboard-configuration-profile.translations.ts`
   - `dashboard-configuration-security.translations.ts`
   - `dashboard-configuration-activity.translations.ts`
   - `dashboard-configuration-avatar.translations.ts` (si aplica)

---

## 17. Referencias tecnicas externas

- Angular child routes / router-outlet:
  - https://angular.dev/guide/routing/common-router-tasks
- OWASP MFA:
  - https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
- NIST SP 800-63B:
  - https://pages.nist.gov/800-63-4/sp800-63b.html
- OWASP File Upload:
  - https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- ngx-image-cropper:
  - https://github.com/Mawi137/ngx-image-cropper
- browser-image-compression:
  - https://github.com/Donaldcwl/browser-image-compression
- java-totp:
  - https://github.com/samdjstevens/java-totp

---

## 18. Siguiente paso recomendado

Partir inmediatamente con **Fase 0** y cerrar en un documento corto adicional:

1. Contrato JSON exacto de endpoints (`request/response/code`).
2. DDL exacto de tablas e indices.
3. Matriz de eventos de `account_activity_log`.

Con eso, backend y frontend pueden avanzar en paralelo sin friccion.
