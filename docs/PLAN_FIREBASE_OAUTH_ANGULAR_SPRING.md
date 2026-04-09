# Plan Firebase OAuth: Angular + Spring (Terra)

## 1. Objetivo

Implementar login/registro con Google via Firebase en la web actual, manteniendo el modelo de sesion existente del backend (JWT + cookies HttpOnly + CSRF).

Repos revisados:

- Frontend: `C:\Users\JeeP_\OneDrive\Escritorio\Terra-web-v2`
- Backend: `C:\Users\JeeP_\OneDrive\Escritorio\terra-api-v2\terra-api`

## 2. Diagnostico actual (confirmado)

### 2.1 Angular

- El frontend usa auth propia contra `/api/auth/*`.
- Servicio central: `src/app/features/auth/services/auth.service.ts`.
- Estado de sesion central: `src/app/features/auth/services/auth-facade.service.ts`.
- Modelo de requests actual sin OAuth social: `src/app/features/auth/models/auth-requests.model.ts`.
- UI auth principal (modal): `src/app/shared/ui/organisms/auth-overlay/auth-overlay.component.html`.

### 2.2 Spring

- Security stateless con filtros propios (JWT/CSRF/rate-limit):
  - `src/main/java/com/terra/api/infrastructure/config/SecurityConfig.java`
- Controlador auth actual:
  - `src/main/java/com/terra/api/auth/api/controller/AuthController.java`
- Entidad de cuenta pensada para auth por email/password:
  - `src/main/java/com/terra/api/auth/domain/model/AccountMaster.java`
- No hay integracion Firebase Admin SDK hoy.

## 3. Complejidad real

No es "muy complicado", pero tampoco es "1 click" por su arquitectura actual.

Estimacion realista:

1. MVP funcional (Google sign-in + sesion backend): 2-4 dias.
2. Produccion hardening (linking de cuentas, tests, edge cases): 4-7 dias.

## 4. Decision de arquitectura recomendada

Usar modelo hibrido:

1. Angular autentica con Google mediante Firebase Auth (obtiene `idToken`).
2. Angular envia `idToken` al backend.
3. Spring valida `idToken` con Firebase Admin SDK.
4. Spring crea/obtiene usuario local y emite cookies actuales (`terra_access_token`, `terra_refresh_token`) + CSRF.

Por que este modelo:

- Conserva todo lo que ya funciona (roles, sesiones, refresh, logout, rate limit, auditoria, notificaciones).
- Evita mover autorizacion de negocio a Firebase.

## 5. Flujo propuesto (end-to-end)

1. Usuario toca "Continuar con Google".
2. Angular abre popup de Firebase (`signInWithPopup`).
3. Obtiene `idToken` y lo manda a `POST /api/auth/oauth/google`.
4. Backend valida token y normaliza email.
5. Backend aplica regla de vinculacion de cuenta:
   - si existe cuenta por email: login en esa cuenta.
   - si no existe: crea cuenta verificada automaticamente.
6. Backend emite cookies de sesion actuales + devuelve `AuthSessionResponse`.
7. Angular actualiza `AuthFacadeService` como en login tradicional.

### 5.1 Step extra recomendado: verificacion por codigo de 6 digitos (one-time)

Idea incorporada al plan:

1. Luego del popup Google exitoso, si el usuario es nuevo en login social (o cuenta local no vinculada aun), backend envia un codigo de 6 digitos al email.
2. Angular cambia a un step en `auth-overlay` para ingresar ese codigo.
3. Backend valida codigo y recien ahi emite sesion final.
4. En siguientes logins sociales del mismo usuario ya vinculado, se saltea este paso (salvo politica de riesgo).

Objetivo:

- Confirmar posesion real del email antes de terminar el alta/login social.
- Reducir riesgo de vinculacion indebida en cuentas locales existentes.

Notas UX importantes:

- Mostrar claramente: "Te enviamos un codigo a {email}".
- Agregar reenviar codigo con cooldown.
- Mostrar contador de expiracion (ej. 10 min).
- Limitar intentos (ej. 5) y rate-limit por IP/cuenta.

## 6. Cambios backend (Spring)

## 6.1 Dependencias y config

1. Agregar Firebase Admin SDK al `pom.xml`.
2. Agregar propiedades de config:
   - `firebase.project-id`
   - `firebase.credentials-path` o variable de entorno equivalente.
3. Crear `FirebaseConfig` para inicializar `FirebaseApp`/`FirebaseAuth`.

## 6.2 Dominio/Modelo de cuenta

En `AccountMaster` agregar campos para trazabilidad social:

1. `authProvider` (LOCAL, GOOGLE).
2. `providerSubject` (Firebase UID o `sub`).
3. `emailVerifiedAt` opcional (si quieren auditoria fina).

Nota acordada para este proyecto: se mantiene `spring.jpa.hibernate.ddl-auto=update` en este rollout (sin migraciones controladas), porque actualmente no hay usuarios activos y cualquier ajuste de entidad/tabla se puede validar y corregir directo en BD con DBeaver si hace falta.

## 6.3 API

Agregar endpoint nuevo en `AuthController`:

1. `POST /api/auth/oauth/google`
2. Request: `{ "idToken": "...", "trustDevice": true|false }`
3. Response: mismo formato que `login`, con cookies y `AuthSessionResponse`.

Si se activa el step de codigo one-time, agregar:

1. `POST /api/auth/oauth/google/start`
2. Request: `{ "idToken": "..." }`
3. Response: `{ "challengeId": "...", "maskedEmail": "...", "requiresEmailCode": true }`
4. `POST /api/auth/oauth/google/verify-email-code`
5. Request: `{ "challengeId": "...", "code": "123456", "trustDevice": true|false }`
6. Response final: igual a login (`AuthSessionResponse` + cookies)

## 6.4 Servicios nuevos

1. `GoogleOAuthService` (valida `idToken`, issuer, audience, exp).
2. `OAuthAccountLinkService` (resuelve crear/vincular cuenta).
3. Reutilizar `issueSession(...)` ya existente en `AuthController` para no duplicar logica.
4. `OAuthEmailCodeService` para:
   - generar codigo de 6 digitos,
   - persistir hash + expiracion,
   - validar intentos,
   - consumir codigo una sola vez.

## 6.5 Seguridad y reglas

1. Rate limit especifico para `/api/auth/oauth/google`.
2. Bloquear login social si email de token no viene verificado por Google.
3. No permitir takeover:
   - si existe cuenta local con email igual, requerir regla explicita de vinculacion (o permitir auto-link solo si politica acordada).
4. Si se usa codigo de 6 digitos:
   - codigo con expiracion corta (ej. 10 min),
   - max intentos por challenge,
   - cooldown de reenvio,
   - invalidacion al consumir.

## 7. Cambios frontend (Angular)

## 7.1 SDK y config

1. Instalar Firebase JS SDK.
2. Agregar config en `environment*.ts` (`firebaseApiKey`, `authDomain`, etc).
3. Crear servicio `firebase-auth.service.ts` en `features/auth/services`.

## 7.2 API cliente

Extender `AuthService` con:

1. `oauthGoogle(payload: { idToken: string; trustDevice?: boolean })`.

## 7.3 Facade

Extender `AuthFacadeService` con:

1. `loginWithGoogle()`:
   - abre popup Firebase,
   - obtiene token,
   - llama backend,
   - si backend responde `requiresEmailCode`, abrir step de codigo en auth overlay,
   - al validar codigo, setear sesion y sync cross-tab igual que `login`.

## 7.4 UI

Agregar boton Google en:

1. `auth-overlay.component.html` (modal principal).
2. Variante de pantalla register/login si hay otra ruta publica separada.
3. Nuevo modo en auth overlay (ej. `oauth-email-code`) con:
   - input de 6 digitos,
   - CTA "Verificar codigo",
   - CTA "Reenviar codigo",
   - mensaje de email destino enmascarado.

## 8. Precondiciones externas (Google/Firebase Console)

Para que el popup muestre dominio correcto y no falle:

1. En Firebase Auth > Authorized domains: incluir `l2terra.online`.
2. En Google Auth Platform > Brand:
   - Homepage con descripcion clara del producto.
   - Enlace visible a Privacy Policy.
   - Nombre de app consistente con el sitio.
3. Verificar dominio en Search Console si Google lo solicita.
4. Logo para pantalla de consentimiento: PNG/JPG/BMP, cuadrado (SVG no aplica ahi).

## 9. Riesgos y decisiones a cerrar antes de codear

1. Politica de link de cuentas:
   - auto-link por email,
   - o flujo de confirmacion para cuentas locales existentes.
2. Usuarios que luego quieran password local:
   - definir si se permite setear password despues.
3. 2FA local con cuenta Google:
   - mantener 2FA actual como capa adicional o excluirla para social login.
4. Politica de step one-time:
   - solo primer login social,
   - o tambien ante nuevas ubicaciones/dispositivos de riesgo.

## 10. Plan por fases (implementacion)

## Fase 0 - Alineacion funcional (medio dia)

1. Cerrar politica de link de cuentas.
2. Cerrar comportamiento 2FA para login social.
3. Definir mensajes UX (errores comunes OAuth).
4. Definir si el codigo por email sera obligatorio siempre o solo primer ingreso social.
5. Definir expiracion, intentos maximos y cooldown de reenvio.

## Fase 1 - Backend MVP (1-2 dias)

1. Config Firebase Admin.
2. Endpoint `/api/auth/oauth/google`.
3. Servicio de validacion de token.
4. Emision de cookies y sesion reutilizando flujo actual.
5. Tests de integracion basicos.

## Fase 2 - Frontend MVP (1 dia)

1. Servicio Firebase popup.
2. Metodo `oauthGoogle` en `AuthService`.
3. `loginWithGoogle` en `AuthFacadeService`.
4. Boton UI y manejo de errores.

## Fase 3 - Hardening (1-3 dias)

1. Casos borde (popup cancelado, token invalido, cuenta bloqueada).
2. Rate limit y telemetria.
3. Tests E2E de login social.
4. Ajustes UX/i18n.

## 11. Checklist de aceptacion

1. Se puede loguear con Google desde la web.
2. Backend sigue siendo source of truth de sesion y roles.
3. Cookies HttpOnly + CSRF siguen funcionando.
4. `me`, `refresh`, `logout`, `logout-all` no se rompen.
5. Usuario nuevo por Google queda creado y usable en dashboard.
6. Usuario existente respeta politica de vinculacion definida.

## 12. Archivos candidatos a tocar (cuando implementemos)

Frontend (`Terra-web-v2`):

1. `src/app/features/auth/services/auth.service.ts`
2. `src/app/features/auth/services/auth-facade.service.ts`
3. `src/app/features/auth/models/auth-requests.model.ts`
4. `src/app/shared/ui/organisms/auth-overlay/auth-overlay.component.html`
5. `src/environments/environment.ts`
6. `src/environments/environment.development.ts`
7. `src/environments/environment.production.ts`
8. Nuevo: `src/app/features/auth/services/firebase-auth.service.ts`

Backend (`terra-api`):

1. `pom.xml`
2. `src/main/java/com/terra/api/infrastructure/config/SecurityConfig.java`
3. `src/main/java/com/terra/api/auth/api/controller/AuthController.java`
4. `src/main/java/com/terra/api/auth/domain/model/AccountMaster.java`
5. Nuevos servicios/config para Firebase y OAuth.

---

Si queres, en el siguiente paso ya arrancamos Fase 0 y te lo convierto en checklist ejecutable por tickets (backend/frontend), para implementarlo de punta a punta sin romper lo actual.
