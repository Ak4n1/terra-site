# Security audit preliminar - l2terra.online

Fecha: 2026-04-20  
Alcance: `https://l2terra.online` y endpoints publicos inferidos desde `src/`  
Tipo de prueba: revision externa y autenticada de bajo impacto, sin fuerza bruta, sin explotacion destructiva y sin modificar datos reales.

## Resumen ejecutivo

El sitio esta detras de Cloudflare, fuerza HTTPS y expone varios headers defensivos correctos. Los endpoints privados revisados responden `401 Unauthorized` desde una sesion anonima, y CORS bloquea origenes externos no permitidos.

Los riesgos principales encontrados no son una toma de control directa, pero si conviene corregirlos antes de una auditoria mas profunda: la API key publica de Firebase parece no tener restriccion por HTTP referrer, la CSP permite `unsafe-inline` y `unsafe-eval`, varias rutas inexistentes devuelven `200` con el HTML de la SPA, y hay headers legacy duplicados/contradictorios en la API.

Se hizo una primera ronda autenticada con una cuenta temporal provista por el propietario. No se documentan credenciales en este reporte. Se recomienda rotar la contrasena de esa cuenta al finalizar las pruebas.

## Hallazgos

| ID | Severidad | Estado | Hallazgo | Riesgo | Recomendacion |
| --- | --- | --- | --- | --- | --- |
| SEC-001 | Medio | Pendiente de confirmar en Google Cloud | La Firebase API key aparece en el bundle publico y una llamada directa desde CLI a Identity Toolkit respondio `MISSING_ID_TOKEN`, no bloqueo por referrer. | La key puede ser usada fuera del dominio para consumir cuota o APIs habilitadas. No implica bypass de auth por si sola. | Restringir la API key a `https://l2terra.online/*` y `https://www.l2terra.online/*` si aplica. Limitar APIs habilitadas a las estrictamente necesarias. Revisar App Check si se usan recursos Firebase sensibles. |
| SEC-002 | Medio | Confirmado | `Content-Security-Policy` permite `script-src 'unsafe-inline' 'unsafe-eval'`. | Si aparece un XSS, la CSP ofrece menos contencion. `unsafe-eval` tambien amplia superficie en dependencias frontend. | Eliminar `unsafe-eval`. Migrar scripts inline a nonce/hash. Mantener dominios externos solo donde sean necesarios: Cloudflare challenge, Google, Firebase, PayPal, etc. |
| SEC-003 | Bajo | Confirmado | Rutas inexistentes como `/actuator`, `/swagger-ui/index.html`, `/server-status`, `/phpinfo.php`, `/sitemap.xml` y `/.well-known/security.txt` devuelven `200` con el HTML de la SPA. | No expone esos servicios, pero confunde scanners, monitoreo, SEO y dificulta detectar 404 reales. | Configurar fallback SPA solo para rutas de frontend conocidas, o devolver `404` para rutas tecnicas y archivos no existentes. Publicar `sitemap.xml` y `security.txt` reales si se quieren usar. |
| SEC-004 | Bajo | Confirmado | Headers `x-xss-protection` aparecen duplicados/contradictorios en respuestas de API: `0` y `1; mode=block`. | Header legacy; la contradiccion no suele romper seguridad moderna, pero indica configuracion duplicada en proxy/backend. | Removerlo o dejar una sola politica desde una unica capa. Preferible apoyarse en CSP moderna. |
| SEC-005 | Bajo | Pendiente de confirmar | Requests a `*.js.map` devuelven `200 text/html` por fallback SPA, no sourcemaps reales. | No se vieron sourcemaps, pero el `200` puede hacer que herramientas crean que existen. Si en algun deploy se publican `.map`, se expondra codigo fuente mas legible. | Bloquear o devolver `404` para `*.map` en produccion si no se publican sourcemaps. Si se publican, verificar que no contengan secretos. |
| SEC-006 | Informativo | Confirmado | La configuracion Firebase del frontend aparece en el bundle: `apiKey`, `authDomain`, `projectId`, `storageBucket`, etc. | Es normal en una SPA y no debe tratarse como secreto. El riesgo depende de reglas/restricciones en Firebase. | No ocultar como si fuera secreto; si restringir API key, revisar reglas de Storage/Auth y monitorear uso. |
| SEC-007 | Informativo | Confirmado | La cuenta de prueba autenticada tiene roles `SUPER_ADMIN` y `USER`. | El acceso a endpoints admin con esa cuenta es esperado, pero no permite validar separacion de permisos contra un usuario comun. | Crear una cuenta temporal no-admin para confirmar que `/api/admin/*` devuelve `403` o `401` segun corresponda. |
| SEC-008 | Alto | Confirmado | La IP del VPS `147.79.82.2` responde directo por `80` y `443`. Forzando `Host/SNI: l2terra.online` contra esa IP, el sitio y la API responden sin pasar por Cloudflare. | Un atacante que conozca la IP puede saltarse Cloudflare/WAF/rate rules/cache y atacar directo el origen. Tambien puede intentar DDoS o abuso de endpoints contra el VPS sin mitigacion de Cloudflare. | En el firewall del VPS permitir `80/443` solo desde rangos oficiales de Cloudflare. Permitir SSH solo desde IP/VPN propia. Configurar default server de Nginx para rechazar hosts desconocidos y desactivar pagina default. |

## Controles que se ven bien

- `http://l2terra.online` redirige a `https://l2terra.online`.
- El dominio resuelve a Cloudflare.
- HSTS activo: `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- `X-Content-Type-Options: nosniff` activo.
- `X-Frame-Options: SAMEORIGIN` activo.
- `Referrer-Policy: strict-origin-when-cross-origin` activo.
- `Permissions-Policy` bloquea geolocalizacion, microfono y camara.
- CORS rechaza preflight desde origen externo no autorizado (`https://evil.example`) con `403 Invalid CORS request`.
- CORS permite origen propio con credenciales para requests esperados.
- `.env` responde `404`.
- `/.git/HEAD` responde `404`.
- Endpoints privados probados sin sesion devuelven `401`.
- Login autenticado emite cookies `terra_access_token` y `terra_refresh_token` con `Secure`, `HttpOnly` y `SameSite=Lax`.
- Cookie `XSRF-TOKEN` se emite con `Secure` y `SameSite=Lax`; no es `HttpOnly`, lo cual es esperable para patron double-submit CSRF.
- CSRF en endpoint mutante autenticado funciona: sin header o con token invalido devuelve `401`; con token correcto devuelve `200`.
- Login fallido tiene rate limit observable: el sexto intento suave con email ficticio devolvio `429` y `Retry-After: 10`.
- Puertos comunes del VPS revisados: solo `80` y `443` aparecen abiertos; `22`, bases de datos y puertos de apps comunes aparecen cerrados/filtrados desde esta red.

## Endpoints revisados anonimamente

### Publico esperado

- `GET /api/auth/config` -> `200 application/json`
  - Devuelve nombres de CSRF: `csrfCookieName=XSRF-TOKEN`, `csrfHeaderName=X-CSRF-TOKEN`.
  - Setea cookie `XSRF-TOKEN` con `Secure` y `SameSite=Lax`.

### Protegidos correctamente desde anonimo

- `GET /api/auth/me` -> `401`
- `GET /api/account/settings/profile` -> `401`
- `GET /api/account/settings/profile/summary?...` -> `401`
- `GET /api/account/settings/avatar` -> `401`
- `GET /api/account/settings/security/status` -> `401`
- `GET /api/account/settings/security/trusted-devices` -> `401`
- `GET /api/account/settings/activity?page=0&size=10&sort=desc` -> `401`
- `GET /api/game-accounts` -> `401`
- `GET /api/notifications?limit=3&page=0&unreadOnly=true` -> `401`
- `GET /api/admin/notifications/templates` -> `401`
- `GET /api/admin/notifications/audit?page=0&size=4` -> `401`
- `GET /api/ws` -> `401`

## Ronda autenticada

Cuenta usada: cuenta temporal provista por el propietario. Las credenciales no se guardan en este reporte.

### Cookies y sesion

Despues de login exitoso:

- `terra_access_token`
  - `Secure`
  - `HttpOnly`
  - `SameSite=Lax`
  - `Max-Age=600`
- `terra_refresh_token`
  - `Secure`
  - `HttpOnly`
  - `SameSite=Lax`
  - `Max-Age=2592000`
- `XSRF-TOKEN`
  - `Secure`
  - `SameSite=Lax`
  - no `HttpOnly`, esperado para que el frontend pueda leerlo y enviarlo como `X-CSRF-TOKEN`.

### Usuario autenticado

`GET /api/auth/me` devuelve un usuario con roles:

- `SUPER_ADMIN`
- `USER`

Esto explica que la cuenta pueda leer endpoints de administracion. Sigue pendiente validar el bloqueo de endpoints admin con una cuenta no-admin.

### Endpoints autenticados revisados

- `GET /api/auth/me` -> `200`
- `GET /api/account/settings/profile` -> `200`
- `GET /api/account/settings/profile/summary?totalAccounts=true&lastLogin=true&createdAt=true` -> `200`
- `GET /api/account/settings/avatar` -> `200`
- `GET /api/account/settings/security/status` -> `200`
- `GET /api/account/settings/security/trusted-devices` -> `200`
- `GET /api/account/settings/activity?page=0&size=10&sort=desc` -> `200`
- `GET /api/game-accounts` -> `200`
- `GET /api/notifications?limit=3&page=0&unreadOnly=true` -> `200`
- `GET /api/admin/notifications/templates` -> `200` con cuenta `SUPER_ADMIN`
- `GET /api/admin/notifications/audit?page=0&size=1` -> `200` con cuenta `SUPER_ADMIN`
- `GET /api/ws` -> `403` al tratarlo como request HTTP normal; queda pendiente probar handshake WebSocket real.

### CSRF autenticado

Endpoint probado: `PATCH /api/auth/preferred-language` con el mismo idioma ya configurado (`es`) para evitar cambios reales.

- Sin `X-CSRF-TOKEN` -> `401`
- Con `X-CSRF-TOKEN` invalido -> `401`
- Con `X-CSRF-TOKEN` correcto, rotado despues de login -> `200`

Conclusion: el control CSRF se comporta correctamente en esta mutacion autenticada.

### Rate limit suave

Endpoint probado: `POST /api/auth/login` con email ficticio y password invalido.

- Intentos 1 a 5 -> `401 auth.invalid_credentials`
- Intento 6 -> `429` con `Retry-After: 10`

Conclusion: existe rate limiting observable en login. No se hizo prueba agresiva ni busqueda del umbral exacto.

## Revision de origen / VPS

IP revisada: `147.79.82.2`

### Resultado

- `http://147.79.82.2/` -> `200 OK`, `nginx/1.18.0 (Ubuntu)`, pagina default "Welcome to nginx!".
- `https://147.79.82.2/` -> `200 OK`, sirve otra SPA con titulo "Juan Encabo".
- `http://l2terra.online/` resuelto manualmente a `147.79.82.2` -> `301` a HTTPS desde Nginx, sin Cloudflare.
- `https://l2terra.online/` resuelto manualmente a `147.79.82.2` -> `200 OK`, sirve la web Terra desde Nginx, sin Cloudflare.
- `https://l2terra.online/api/auth/config` resuelto manualmente a `147.79.82.2` -> `200 OK`, la API responde directo desde el origen.

### Puertos comunes revisados

Abiertos:

- `80/tcp`
- `443/tcp`

Cerrados o filtrados desde esta red:

- `22/tcp`
- `8080/tcp`
- `8443/tcp`
- `3306/tcp`
- `5432/tcp`
- `6379/tcp`
- `27017/tcp`
- `9200/tcp`
- `9300/tcp`
- `9000/tcp`
- `9090/tcp`
- `3000/tcp`
- `5000/tcp`
- `8000/tcp`
- `8081/tcp`

### Impacto

Cloudflare protege el dominio publico, pero no protege el origen si el atacante conecta directo a `147.79.82.2`. Esto permite evitar reglas WAF/rate limiting/cache configuradas en Cloudflare y presionar directamente Nginx/backend.

### Recomendacion

- Firewall del VPS: permitir `80/443` solo desde rangos oficiales de Cloudflare.
- Firewall del VPS: permitir `22` solo desde IP propia o VPN.
- Nginx: eliminar pagina default y responder `444`/`403` para hosts desconocidos o acceso por IP.
- Nginx: desactivar `server_tokens` para no revelar `nginx/1.18.0 (Ubuntu)`.
- Confirmar que no existan registros DNS historicos, subdominios, certificados o servicios externos que publiquen la IP de origen.

## Endpoints reales inferidos desde el frontend

Fuentes principales:

- `src/app/features/auth/services/auth.service.ts`
- `src/app/features/dashboard/services/game-account-create.service.ts`
- `src/app/features/dashboard/services/game-account-change-password.service.ts`
- `src/app/core/notifications/notifications.api.ts`
- `src/app/core/admin-notifications/admin-notifications.api.ts`
- `src/app/core/realtime/realtime.service.ts`

Categorias:

- Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/verify-email`, `/api/auth/resend-verification`, `/api/auth/reset-password`, `/api/auth/logout`, `/api/auth/logout-all`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/preferred-language`, `/api/auth/2fa/recovery/*`, `/api/auth/oauth/google/*`.
- Account settings: `/api/account/settings/profile`, `/api/account/settings/avatar`, `/api/account/settings/security/*`, `/api/account/settings/activity`.
- Game accounts: `/api/game-accounts`, `/api/game-accounts/create-code`, `/api/game-accounts/verify-code`, `/api/game-accounts/change-password/*`.
- Notifications: `/api/notifications`, `/api/notifications/{id}/read`, `/api/notifications/read-all`.
- Admin notifications: `/api/admin/notifications`, `/api/admin/notifications/templates`, `/api/admin/notifications/audit`, `/api/admin/notifications/broadcast`.
- Realtime: `/api/ws`.

## Pendientes con sesion autenticada

Estas pruebas requieren una cuenta temporal de usuario comun y, si existe panel admin, una cuenta admin temporal. No usar cuentas reales con datos sensibles.

1. Verificar cookies de sesion:
   - `HttpOnly`
   - `Secure`
   - `SameSite`
   - expiracion
   - rotacion al login/logout/refresh
2. Verificar CSRF:
   - mutaciones sin `X-CSRF-TOKEN`
   - mutaciones con token invalido
   - mutaciones desde origen externo
3. Verificar autorizacion por rol:
   - usuario comun contra `/api/admin/notifications/*`
   - admin contra endpoints admin
   - anonimo contra endpoints admin
   - estado actual: cuenta probada es `SUPER_ADMIN`, por lo que no valida el caso no-admin
4. Verificar IDOR:
   - `trusted-devices/{sessionId}`
   - `notifications/{notificationId}/read`
   - `game-accounts` y cambio de password de cuenta de juego
   - avatar custom por URL/id si existe
5. Verificar rate limiting:
   - login fallido: rate limit observado en intento 6 con `Retry-After: 10`
   - register
   - forgot password
   - resend verification
   - 2FA recovery
   - game account create/change password code
6. Verificar enumeracion de usuarios:
   - diferencias entre email existente/no existente en login, forgot password, resend verification y OAuth email-code.
7. Verificar subida de avatar:
   - extension permitida
   - MIME real vs extension
   - tamano maximo
   - contenido SVG/HTML
   - path traversal en nombre de archivo
   - cache y permisos de lectura
8. Verificar 2FA:
   - reuso de codigo
   - tolerancia temporal
   - brute force/rate limit
   - recovery token single-use y expiracion
9. Verificar idempotencia:
   - reuso de `Idempotency-Key`
   - requests concurrentes para crear cuenta/cambiar password
10. Verificar WebSocket:
   - conexion anonima
   - conexion con sesion expirada
   - suscripciones a canales de otro usuario
   - estado actual: `GET /api/ws` no es handshake real y devuelve `403`
11. Verificar headers en respuestas autenticadas:
   - `Cache-Control: no-store` en datos sensibles
   - ausencia de datos privados en respuestas de error
12. Verificar logs/errores:
   - no filtrar stack traces
   - no filtrar SQL/ORM/internal class names
   - codigos de error consistentes

## Recomendaciones priorizadas

1. Restringir Firebase API key por HTTP referrer y APIs habilitadas.
2. Revisar reglas de Firebase Storage/Auth en consola; confirmar que no hay lectura/escritura anonima no deseada.
3. Endurecer CSP removiendo `unsafe-eval` y reduciendo `unsafe-inline` con nonce/hash.
4. Ajustar fallback SPA para que rutas tecnicas inexistentes y `*.map` devuelvan `404`.
5. Unificar headers de seguridad en una sola capa: Cloudflare, Nginx o backend, pero evitar duplicados contradictorios.
6. Crear una cuenta temporal no-admin para validar separacion de roles.
7. Continuar pruebas autenticadas con cambios controlados y rotar credenciales al cerrar la auditoria.

## Notas de alcance

- No se hizo fuerza bruta.
- No se probaron payloads destructivos.
- No se intento explotar SQLi, SSRF, RCE ni bypasses agresivos.
- No se modificaron datos de produccion.
- Las conclusiones sobre controles autenticados son preliminares hasta probar con sesion real.
