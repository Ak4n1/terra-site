# Casos de uso de autenticacion y roles

## Alcance

Documento enfocado solo en casos de uso del flujo de autenticacion y autorizacion entre:

- Frontend Angular: `Terra-web-v2`
- Backend Spring: `terra-api`

Esta version esta centrada en:

- actor usuario
- actor sistema
- pasos principales
- alternativos
- postcondiciones
- puntos tecnicos clave como `/me`, JWT con `aud`, refresh opaco, rotacion, CSRF, revocacion y roles

## Actores

- Visitante
- Usuario no verificado
- Usuario autenticado
- Usuario con 2FA
- Frontend Angular
- Backend Spring Security
- Servicio de correo
- Google/Firebase
- Realtime WebSocket

## Indice rapido

### Casos de uso del usuario

- `CU-U01` Registro local con email y password
- `CU-U02` Reenvio de email de verificacion
- `CU-U03` Verificacion de email
- `CU-U04` Login local sin 2FA
- `CU-U05` Login local con 2FA y trusted device
- `CU-U06` Bootstrap de sesion con `/api/auth/me`
- `CU-U07` Continuidad de sesion con refresh silencioso y rotacion
- `CU-U08` Logout de la sesion actual
- `CU-U09` Logout de todas las sesiones
- `CU-U10` Solicitud de recuperacion de password
- `CU-U11` Reset de password desde email
- `CU-U12` Cambio de password desde sesion autenticada
- `CU-U13` Activacion de 2FA
- `CU-U14` Recovery de 2FA por email
- `CU-U15` Listado y revocacion de trusted devices
- `CU-U16` Login con Google ya vinculado
- `CU-U17` Login con Google no vinculado con codigo por email
- `CU-U18` Uso de realtime sobre sesion autenticada

### Casos de uso del sistema

- `CU-S01` Emision de sesion HTTP
- `CU-S02` Validacion del access JWT para API
- `CU-S03` Validacion de sesion realtime
- `CU-S04` Rotacion del refresh opaco
- `CU-S05` Repeticion idempotente del refresh
- `CU-S06` Revocacion inmediata por `tokenVersion`
- `CU-S07` Proteccion CSRF
- `CU-S08` Autorizacion por roles
- `CU-S09` Rate limiting de auth
- `CU-S10` Sincronizacion entre tabs y uso de `localStorage`

---

## Casos de uso del usuario

## `CU-U01` Registro local con email y password

**Objetivo**

Crear una cuenta local con credenciales propias y dejarla pendiente de verificacion de email.

**Actor principal**

- Visitante

**Precondiciones**

- El email no debe existir previamente.
- El password debe cumplir la validacion del backend.

**Flujo principal**

1. El visitante completa el formulario de registro en Angular.
2. El frontend llama `POST /api/auth/register`.
3. El backend normaliza el email.
4. El backend valida unicidad por email.
5. El backend busca el rol `USER`.
6. El backend crea `AccountMaster` con:
   - `passwordHash` con BCrypt
   - `emailVerified=false`
   - `authProvider=LOCAL`
   - `roles={USER}`
7. El backend persiste la cuenta.
8. El backend genera un token de verificacion de email.
9. El backend guarda solo el hash del token en `AccountVerification`.
10. El backend envia el correo con el link de verificacion.
11. El frontend muestra feedback de alta exitosa.

**Flujos alternativos**

- Si el email ya existe, responde conflicto.
- Si el password no cumple formato, responde validacion fallida.

**Postcondiciones**

- Existe la cuenta local.
- La cuenta aun no puede loguear.
- Queda pendiente el paso de verificacion de email.

**Implementacion asociada**

- `AuthController.register()`
- `AuthServiceImpl.register()`
- `EmailVerificationService.createOrRefreshEmailVerification()`
- `VerificationTokenService.createOrRefresh()`

---

## `CU-U02` Reenvio de email de verificacion

**Objetivo**

Emitir un nuevo email de verificacion para una cuenta local aun no verificada.

**Actor principal**

- Usuario no verificado

**Precondiciones**

- La cuenta existe.
- La cuenta aun no esta verificada.
- No debe estar en cooldown de reenvio.

**Flujo principal**

1. El usuario solicita reenviar el email.
2. El frontend llama `POST /api/auth/resend-verification`.
3. El backend aplica cooldown por email.
4. El backend genera un nuevo token raw.
5. El backend reemplaza el hash del token previo en `AccountVerification`.
6. El backend envia un nuevo correo de verificacion.
7. El frontend muestra feedback generico.

**Flujos alternativos**

- Si la cuenta no existe, la respuesta sigue siendo generica para reducir enumeracion.
- Si la cuenta ya esta verificada, la respuesta publica sigue siendo controlada.
- Si hay cooldown, responde `429`.

**Postcondiciones**

- El token anterior deja de servir.
- Solo el nuevo token queda activo.

**Implementacion asociada**

- `AuthController.resendVerification()`
- `EmailVerificationService.resendVerificationEmail()`

---

## `CU-U03` Verificacion de email

**Objetivo**

Confirmar la posesion del email y habilitar login local.

**Actor principal**

- Usuario no verificado

**Precondiciones**

- El usuario recibio un token valido.
- El token no debe estar expirado ni usado.

**Flujo principal**

1. El usuario abre el link del email.
2. Angular carga `/verify-email?token=...`.
3. La pagina lee el token desde la query string.
4. El frontend llama `POST /api/auth/verify-email`.
5. El backend busca el hash del token por tipo `EMAIL_VERIFICATION`.
6. El backend valida que el token siga activo.
7. El backend marca la cuenta como verificada.
8. El backend marca el token como usado.
9. El frontend muestra confirmacion.

**Flujos alternativos**

- Si el token no existe, responde `auth.invalid_verification_token`.
- Si el token expiro o ya fue usado, responde el mismo error.

**Postcondiciones**

- `emailVerified=true`
- La cuenta ya puede autenticarse.

**Implementacion asociada**

- `VerifyEmailPage`
- `AuthController.verifyEmail()`
- `EmailVerificationService.verifyEmail()`

---

## `CU-U04` Login local sin 2FA

**Objetivo**

Autenticar una cuenta local verificada y emitir la sesion HTTP.

**Actor principal**

- Usuario verificado

**Precondiciones**

- La cuenta existe.
- `emailVerified=true`
- Password correcto.
- 2FA desactivado o no requerido.

**Flujo principal**

1. El usuario ingresa email y password.
2. Angular llama `POST /api/auth/login`.
3. Spring autentica con `AuthenticationManager`.
4. El backend valida que la cuenta este verificada.
5. El backend actualiza `lastLoginAt`.
6. El backend emite:
   - access token JWT
   - refresh token opaco
   - CSRF token
7. El backend crea una fila `AccountSession` con hash del refresh token.
8. Angular recibe `AuthSessionResponse` con `user`.
9. Angular guarda `session.user` solo en memoria.
10. Angular publica evento `login` para otras tabs.
11. El usuario es redirigido a dashboard.

**Flujos alternativos**

- Credenciales invalidas: `401 auth.invalid_credentials`
- Email no verificado: error funcional y cambio de UI a modo verify-email

**Postcondiciones**

- El browser queda con:
  - `terra_access_token`
  - `terra_refresh_token`
  - `XSRF-TOKEN`
- El frontend no conoce los tokens; solo conoce el `user` retornado.

**Implementacion asociada**

- `AuthOverlayContainerComponent.handleLogin()`
- `AuthFacadeService.login()`
- `AuthController.login()`
- `AuthServiceImpl.authenticate()`
- `AuthController.issueSession()`

---

## `CU-U05` Login local con 2FA y trusted device

**Objetivo**

Autenticar una cuenta protegida con TOTP, con posibilidad de recordar el dispositivo.

**Actor principal**

- Usuario con 2FA activo

**Precondiciones**

- La cuenta tiene `twoFactorEnabled=true`.
- Password principal correcto.

**Flujo principal**

1. El usuario ingresa email y password.
2. Si existe cookie `terra_trusted_device`, el backend intenta validarla.
3. Si el dispositivo confiable sigue activo, no pide TOTP.
4. Si el dispositivo no es valido, el backend exige `twoFactorCode`.
5. El usuario ingresa el codigo TOTP de 6 digitos.
6. El backend valida el TOTP contra `twoFactorSecret`.
7. Si `trustDevice=true`, el backend:
   - genera o reutiliza una key de dispositivo
   - guarda solo su hash en `AccountTrustedDevice`
   - emite la cookie `terra_trusted_device`
8. Luego sigue el flujo normal de login y emision de sesion HTTP.

**Flujos alternativos**

- Sin codigo TOTP: `auth.two_factor_required`
- Codigo invalido: `auth.two_factor_code_invalid`
- Trusted device expirado o revocado: se vuelve a exigir TOTP

**Postcondiciones**

- El usuario queda autenticado.
- Si marco trust device, futuros logins desde ese dispositivo pueden evitar el paso TOTP.

**Implementacion asociada**

- `AuthServiceImpl.authenticate()`
- `AccountTrustedDevice`
- `AccountTrustedDeviceRepository`

---

## `CU-U06` Bootstrap de sesion con `/api/auth/me`

**Objetivo**

Reconstruir el estado de sesion del frontend despues de un refresh de pagina o apertura de una nueva tab.

**Actor principal**

- Usuario autenticado

**Precondiciones**

- El browser aun conserva cookies validas de sesion.

**Flujo principal**

1. Angular inicia la app.
2. `AuthClientConfigService` carga `/api/auth/config` para conocer nombres de CSRF.
3. `App` dispara `authFacade.bootstrapSession()`.
4. `AuthFacadeService` llama `GET /api/auth/me`.
5. `JwtAuthenticationFilter` lee `terra_access_token`.
6. El backend valida el access JWT.
7. El backend arma el `SecurityContext`.
8. `AuthController.me()` responde `UserResponse`.
9. Angular guarda `session.user` en memoria y marca estado `authenticated`.
10. Los guards habilitan `/dashboard`.

**Flujos alternativos**

- Si el access token ya no sirve, `/me` responde `401`.
- Si ademas hay rate limit de sesion, Angular entra en estado `rate-limited`.

**Postcondiciones**

- El frontend recupera identidad sin guardar tokens en `localStorage`.

**Implementacion asociada**

- `App`
- `AuthFacadeService.bootstrapSession()`
- `AuthController.me()`
- `JwtAuthenticationFilter`

---

## `CU-U07` Continuidad de sesion con refresh silencioso y rotacion

**Objetivo**

Mantener la sesion activa cuando vence el access token, rotando el refresh token en cada renovacion.

**Actor principal**

- Usuario autenticado

**Precondiciones**

- Existe `terra_refresh_token` vigente.
- Existe `XSRF-TOKEN` valido.
- El access token expiro o quedo invalido.

**Flujo principal**

1. El usuario ejecuta una accion autenticada.
2. El request original recibe `401`.
3. `authRefreshInterceptor` detecta que el endpoint original no es publico.
4. Angular llama `POST /api/auth/refresh`.
5. El backend lee `terra_refresh_token`.
6. El backend exige tambien CSRF valido para `/refresh`.
7. `AccountSessionService.getActiveSession()` busca la sesion por hash del refresh token.
8. El backend resuelve la cuenta duena de esa sesion.
9. El backend genera:
   - nuevo access JWT
   - nuevo refresh opaco
   - nuevo CSRF token
10. `AccountSessionService.rotateSession()`:
    - marca `revokedAt` en la sesion anterior
    - crea una nueva fila `AccountSession`
    - guarda hash del nuevo refresh token
11. El backend responde con nuevas cookies.
12. Angular relee la cookie CSRF.
13. Angular reintenta el request original.
14. El usuario continua la accion sin re-login visible.

**Flujos alternativos**

- Si falta CSRF o no coincide, el backend responde `auth.invalid_csrf_token`.
- En ese caso, Angular intenta `GET /api/auth/config`, recupera CSRF y reintenta una vez.
- Si el refresh token ya fue rotado, expirado o revocado, responde `auth.invalid_refresh_token`.
- Si el refresh falla definitivamente, Angular limpia la sesion local.

**Detalle tecnico clave: refresh opaco**

- El refresh activo no es JWT.
- Se genera con `OpaqueTokenService`.
- En DB solo se persiste `refreshTokenHash`.
- El servidor no parsea claims de refresh; siempre resuelve por estado real de sesion.

**Detalle tecnico clave: rotacion**

- Cada `/api/auth/refresh` exitoso invalida el refresh anterior.
- La sesion nueva se crea como un nuevo registro.
- La anterior queda revocada.
- Esto reduce replay de refresh antiguos.

**Detalle tecnico clave: idempotencia**

- `/api/auth/refresh` acepta `Idempotency-Key`.
- Si el mismo refresh se reintenta con la misma key y mismo payload canonico, el backend puede devolver la misma respuesta ya calculada.

**Postcondiciones**

- El browser termina con un nuevo access token, un nuevo refresh token y un nuevo CSRF token.
- El refresh anterior deja de ser valido.

**Implementacion asociada**

- `authRefreshInterceptor`
- `AuthController.refresh()`
- `AuthController.refreshInternal()`
- `AccountSessionService.getActiveSession()`
- `AccountSessionService.rotateSession()`
- `OpaqueTokenService`
- `IdempotencyService`

---

## `CU-U08` Logout de la sesion actual

**Objetivo**

Cerrar solo la sesion HTTP actual y limpiar cookies del navegador.

**Actor principal**

- Usuario autenticado

**Precondiciones**

- Existe una refresh session actual.

**Flujo principal**

1. El usuario ejecuta logout.
2. Angular llama `POST /api/auth/logout`.
3. El backend lee el refresh token actual.
4. El backend revoca la `AccountSession` correspondiente.
5. El backend revoca la sesion realtime asociada si existe.
6. El backend limpia:
   - access cookie
   - refresh cookie
   - CSRF cookie
7. Angular limpia `session.user` en memoria.
8. Angular publica evento cross-tab `logout`.

**Flujos alternativos**

- Si el refresh ya no es valido, el backend intenta igualmente limpiar cookies y continuar logout.

**Postcondiciones**

- La sesion actual queda cerrada.
- Otras sesiones del mismo usuario siguen activas.

**Implementacion asociada**

- `AuthFacadeService.logout()`
- `AuthController.logout()`

---

## `CU-U09` Logout de todas las sesiones

**Objetivo**

Cerrar todas las sesiones activas del usuario en todos los dispositivos.

**Actor principal**

- Usuario autenticado

**Precondiciones**

- El usuario esta autenticado.

**Flujo principal**

1. El usuario ejecuta logout-all.
2. Angular llama `POST /api/auth/logout-all`.
3. El backend incrementa `tokenVersion` de la cuenta.
4. El backend revoca todas las `AccountSession` de esa cuenta.
5. El backend revoca realtime sessions de la cuenta.
6. El backend limpia cookies de la tab actual.
7. Angular limpia estado local y publica `logout-all`.

**Efecto tecnico clave**

- Los access JWT ya emitidos dejan de servir de inmediato porque el filtro compara el claim `ver` con `AccountMaster.tokenVersion`.

**Postcondiciones**

- Ninguna refresh session previa queda activa.
- Ningun access JWT previo vuelve a autenticar.

**Implementacion asociada**

- `AuthServiceImpl.revokeAllSessions()`
- `AuthController.logoutAll()`

---

## `CU-U10` Solicitud de recuperacion de password

**Objetivo**

Permitir que un usuario reciba un email para resetear su password.

**Actor principal**

- Visitante o usuario no autenticado

**Precondiciones**

- Ninguna visible para el cliente.

**Flujo principal**

1. El usuario ingresa su email en el flujo "forgot password".
2. Angular llama `POST /api/auth/forgot-password`.
3. El backend aplica cooldown por email.
4. Si la cuenta existe:
   - genera token de reset
   - persiste hash en `AccountVerification`
   - envia email con link de reset
5. La respuesta publica es generica.

**Flujos alternativos**

- Si el email no existe, el backend no revela ese dato.
- Si hay cooldown, responde `429`.

**Postcondiciones**

- Si la cuenta existe, queda un token de reset activo por tiempo limitado.

**Implementacion asociada**

- `AuthController.forgotPassword()`
- `PasswordResetService.sendResetPasswordEmailIfPossible()`

---

## `CU-U11` Reset de password desde email

**Objetivo**

Cambiar la password usando un token recibido por correo.

**Actor principal**

- Usuario con token de reset valido

**Precondiciones**

- El token de reset existe, no expiro y no fue usado.

**Flujo principal**

1. El usuario abre el link del correo.
2. Angular muestra la pantalla de reset.
3. El frontend llama `POST /api/auth/reset-password`.
4. El backend valida el token de tipo `PASSWORD_RESET`.
5. El backend verifica que la nueva password no sea igual a la actual.
6. El backend cambia el `passwordHash`.
7. El backend incrementa `tokenVersion`.
8. El backend revoca todas las `AccountSession`.
9. El backend revoca realtime sessions.
10. El backend limpia cookies auth y CSRF.
11. Angular limpia su estado local.

**Flujos alternativos**

- Token invalido o expirado: error de token de reset.
- Nueva password igual a la actual: error funcional.

**Postcondiciones**

- Solo la nueva password sirve.
- Toda sesion previa queda invalidada.

**Implementacion asociada**

- `AuthController.resetPassword()`
- `PasswordResetService.resetPassword()`
- `PasswordResetService.applyPasswordReset()`

---

## `CU-U12` Cambio de password desde sesion autenticada

**Objetivo**

Cambiar la password desde la configuracion de seguridad usando password actual.

**Actor principal**

- Usuario autenticado

**Precondiciones**

- La sesion es valida.
- El usuario conoce la password actual.

**Flujo principal**

1. El usuario completa password actual, nueva y confirmacion.
2. Angular llama `POST /api/account/settings/security/password/change/confirm`.
3. El backend valida password actual.
4. El backend valida coincidencia entre nueva y confirmacion.
5. El backend aplica el mismo motor de revocacion usado en reset:
   - cambia `passwordHash`
   - incrementa `tokenVersion`
   - revoca sesiones
   - revoca realtime

**Flujos alternativos**

- Password actual incorrecta.
- Nueva password y confirmacion no coinciden.

**Postcondiciones**

- Todas las sesiones anteriores quedan invalidadas.

**Implementacion asociada**

- `AccountSettingsSecurityController.confirmPasswordChange()`
- `AccountPasswordSecurityService.changePassword()`

---

## `CU-U13` Activacion de 2FA

**Objetivo**

Habilitar TOTP para reforzar login.

**Actor principal**

- Usuario autenticado

**Precondiciones**

- La sesion actual es valida.

**Flujo principal**

1. El usuario inicia setup 2FA.
2. Angular llama `POST /api/account/settings/security/2fa/setup/init`.
3. El backend genera un secreto TOTP y un QR.
4. Angular muestra QR y secreto.
5. El usuario escanea y genera un codigo.
6. Angular llama `POST /api/account/settings/security/2fa/setup/verify`.
7. El backend valida el codigo TOTP.
8. Si se habilita por primera vez:
   - pone `twoFactorEnabled=true`
   - guarda timestamp de activacion
   - incrementa `tokenVersion`
   - revoca todas las sesiones salvo la actual
   - revoca trusted devices previos
   - rota la sesion HTTP actual
9. El backend emite nueva cookie `terra_trusted_device`.

**Flujos alternativos**

- Si no hubo `init`, responde que el setup no fue inicializado.
- Si el codigo es invalido, responde error de 2FA.

**Postcondiciones**

- Los proximos logins exigiran TOTP o trusted device valido.

**Implementacion asociada**

- `AccountSecurityService.initTwoFactorSetup()`
- `AccountSecurityService.verifyTwoFactorSetup()`
- `AccountSettingsSecurityController.verifyTwoFactorSetup()`

---

## `CU-U14` Recovery de 2FA por email

**Objetivo**

Permitir recuperar el acceso cuando el usuario perdio su segundo factor.

**Actor principal**

- Usuario con 2FA activo

**Precondiciones**

- La cuenta tiene 2FA habilitado.

**Flujo principal**

1. El usuario solicita recovery.
2. El backend genera token `TWO_FACTOR_RECOVERY`.
3. El backend envia un email con link de recovery.
4. El usuario abre el link.
5. El frontend llama al endpoint de confirmacion con:
   - token de recovery
   - password actual
6. El backend valida token y password.
7. El backend deshabilita 2FA.
8. El backend limpia `twoFactorSecret`.
9. El backend incrementa `tokenVersion`.
10. El backend revoca todas las sesiones.
11. El backend revoca todos los trusted devices.
12. El backend revoca realtime sessions.

**Flujos alternativos**

- Token invalido o expirado.
- Password actual incorrecta.

**Postcondiciones**

- La cuenta vuelve a login normal sin TOTP.
- Todo dispositivo debe volver a autenticarse.

**Implementacion asociada**

- `AccountSecurityService.requestTwoFactorRecovery()`
- `AccountSecurityService.confirmTwoFactorRecovery()`

---

## `CU-U15` Listado y revocacion de trusted devices

**Objetivo**

Gestionar dispositivos confiables asociados a 2FA.

**Actor principal**

- Usuario autenticado

**Precondiciones**

- La sesion actual es valida.

**Flujo principal**

1. El usuario entra a configuracion de seguridad.
2. Angular llama `GET /api/account/settings/security/trusted-devices`.
3. El backend lista trusted devices activos.
4. El usuario puede revocar uno o todos.
5. Angular llama:
   - `DELETE /trusted-devices/{id}`, o
   - `POST /trusted-devices/revoke-all`
6. El backend marca `revokedAt` en los dispositivos afectados.

**Postcondiciones**

- Los dispositivos revocados ya no pueden bypassear 2FA.

**Implementacion asociada**

- `AccountSecurityService.listTrustedDevices()`
- `AccountSecurityService.revokeTrustedDevice()`
- `AccountSecurityService.revokeAllTrustedDevices()`

---

## `CU-U16` Login con Google ya vinculado

**Objetivo**

Autenticar una cuenta ya vinculada a Google sin pedir codigo extra.

**Actor principal**

- Usuario social existente

**Precondiciones**

- El usuario obtiene un `idToken` valido desde Firebase popup.
- El `providerSubject` ya esta vinculado a una cuenta local.

**Flujo principal**

1. Angular abre popup Google.
2. Firebase devuelve `idToken`.
3. Angular llama `POST /api/auth/oauth/google/start`.
4. El backend valida el token con Firebase Admin.
5. El backend valida que el email de Google venga verificado.
6. El backend encuentra una cuenta vinculada por `providerSubject`.
7. El backend toca `lastLoginAt` y asegura email verificado.
8. El backend emite la sesion HTTP normal:
   - access JWT
   - refresh opaco
   - CSRF
9. Angular carga la sesion en memoria.

**Flujos alternativos**

- Si el token Google es invalido, responde error de OAuth.
- Si el email de Google no viene verificado, responde rechazo.

**Postcondiciones**

- La cuenta queda autenticada como cualquier login normal.

**Implementacion asociada**

- `FirebaseAuthService`
- `AuthFacadeService.loginWithGoogle()`
- `GoogleOAuthService.startAuthentication()`

---

## `CU-U17` Login con Google no vinculado con codigo por email

**Objetivo**

Completar login Google cuando la cuenta aun no esta vinculada y el backend exige confirmacion adicional por email.

**Actor principal**

- Usuario social nuevo o no vinculado

**Precondiciones**

- El `idToken` Google es valido.
- No existe match previo por `providerSubject`.

**Flujo principal**

1. Angular obtiene `idToken` desde Firebase.
2. Angular llama `POST /api/auth/oauth/google/start`.
3. El backend valida el `idToken`.
4. Si no hay vinculacion previa, genera `OAuthGoogleEmailCodeChallenge`.
5. El backend genera un codigo de 6 digitos.
6. El backend guarda solo el hash del codigo.
7. El backend envia el codigo por email.
8. Angular cambia a modo `oauth-email-code`.
9. El usuario ingresa el codigo.
10. Angular llama `POST /api/auth/oauth/google/verify-email-code`.
11. El backend valida challenge, expiracion e intentos.
12. El backend crea o vincula la cuenta local.
13. Si crea cuenta nueva, asigna rol `USER`.
14. El backend emite la sesion HTTP normal.

**Flujos alternativos**

- Codigo invalido: error de challenge
- Maximo de intentos excedido: `429`
- Reenvio del codigo: `POST /api/auth/oauth/google/resend-email-code`
- Cooldown de reenvio: `429`

**Postcondiciones**

- La cuenta social queda vinculada.
- Queda autenticada con el mismo modelo de sesion que login local.

**Implementacion asociada**

- `GoogleOAuthService`
- `OAuthGoogleEmailCodeService`
- `OAuthGoogleEmailCodeChallenge`

---

## `CU-U18` Uso de realtime sobre sesion autenticada

**Objetivo**

Abrir el canal WebSocket autenticado usando la misma sesion HTTP del usuario.

**Actor principal**

- Usuario autenticado

**Precondiciones**

- El browser tiene cookies de auth validas.

**Flujo principal**

1. Angular detecta estado `authenticated`.
2. `RealtimeService` intenta abrir `/api/ws`.
3. El handshake envia cookies existentes del browser.
4. El backend exige:
   - access token valido
   - refresh token activo
5. El access JWT se valida contra `audienceRealtime`.
6. El refresh se valida contra `AccountSession`.
7. El backend comprueba que ambos pertenezcan a la misma cuenta.
8. El backend construye `RealtimePrincipal`.
9. La conexion queda abierta.

**Flujos alternativos**

- Si falta el access token, se rechaza.
- Si falta o esta revocada la refresh session, se rechaza.
- Si hay logout o logout-all, la sesion realtime se cierra.
- Si el backend emite `system.refresh_required`, Angular vuelve a bootstrapear sesion.

**Postcondiciones**

- El usuario queda conectado al canal realtime solo mientras su sesion HTTP siga valida.

**Implementacion asociada**

- `RealtimeService`
- `RealtimeAuthenticationService`

---

## Casos de uso del sistema

## `CU-S01` Emision de sesion HTTP

**Objetivo**

Emitir y persistir una sesion segura luego de una autenticacion exitosa.

**Actor principal**

- Backend Spring

**Entrada**

- `AccountMaster` autenticado
- request HTTP actual

**Flujo principal**

1. Genera `access JWT`.
2. Genera `refresh token` opaco.
3. Emite cookies:
   - `terra_access_token`
   - `terra_refresh_token`
4. Emite `XSRF-TOKEN`.
5. Persiste `AccountSession` con:
   - hash del refresh
   - expiracion
   - IP
   - user agent

**Postcondiciones**

- La sesion queda activa tanto para API como para refresh.

**Implementacion asociada**

- `AuthController.issueSession()`
- `JwtService.generateAccessToken()`
- `OpaqueTokenService.generate()`
- `AccountSessionService.createSession()`

---

## `CU-S02` Validacion del access JWT para API

**Objetivo**

Autenticar requests HTTP contra endpoints protegidos.

**Actor principal**

- Backend Spring

**Flujo principal**

1. Lee `terra_access_token` desde cookies.
2. Valida firma y algoritmo permitido.
3. Valida `iss`.
4. Valida `aud` contra `jwt.audience-api`.
5. Valida claim `type=ACCESS`.
6. Extrae `sub=publicId`.
7. Busca la cuenta en DB.
8. Extrae claim `ver`.
9. Compara `ver` con `AccountMaster.tokenVersion`.
10. Si todo coincide, arma `SecurityContext` con authorities `ROLE_*`.

**Postcondiciones**

- El request queda autenticado a nivel Spring Security.

**Implementacion asociada**

- `JwtAuthenticationFilter`
- `JwtService`

---

## `CU-S03` Validacion de sesion realtime

**Objetivo**

Autenticar el canal WebSocket con una validacion mas fuerte que la API HTTP.

**Actor principal**

- Backend Spring

**Flujo principal**

1. Lee access y refresh cookies.
2. Valida access JWT con `jwt.audience-realtime`.
3. Valida refresh token contra `AccountSessionService.getActiveSession()`.
4. Verifica que ambos pertenezcan a la misma cuenta.
5. Verifica `tokenVersion`.
6. Exige cuenta habilitada y email verificado.

**Postcondiciones**

- Solo una sesion HTTP realmente activa puede abrir realtime.

**Implementacion asociada**

- `RealtimeAuthenticationService`

---

## `CU-S04` Rotacion del refresh opaco

**Objetivo**

Rotar el refresh token en cada renovacion de credenciales.

**Actor principal**

- Backend Spring

**Flujo principal**

1. Recibe `POST /api/auth/refresh`.
2. Valida la refresh session activa.
3. Genera nuevo refresh opaco.
4. Revoca la sesion anterior.
5. Crea nueva `AccountSession`.
6. Emite nuevo access JWT.
7. Emite nuevo CSRF token.

**Postcondiciones**

- El refresh previo ya no puede usarse.
- El cliente trabaja siempre sobre el refresh mas reciente.

**Implementacion asociada**

- `AuthController.refreshInternal()`
- `AccountSessionService.rotateSession()`

---

## `CU-S05` Repeticion idempotente del refresh

**Objetivo**

Evitar dobles rotaciones inconsistentes cuando el cliente reintenta el mismo refresh.

**Actor principal**

- Backend Spring

**Flujo principal**

1. El cliente envia `Idempotency-Key`.
2. El backend construye hash canonico del request.
3. Si esa key ya fue completada para el mismo payload:
   - replaya la misma respuesta
4. Si esta en progreso:
   - rechaza por conflicto
5. Si no existe:
   - ejecuta el refresh normalmente

**Postcondiciones**

- Un retry no genera dos rotaciones distintas para la misma operacion.

**Implementacion asociada**

- `IdempotencyService`
- `AuthController.refresh()`

---

## `CU-S06` Revocacion inmediata por `tokenVersion`

**Objetivo**

Invalidar access tokens ya emitidos sin esperar expiracion natural.

**Actor principal**

- Backend Spring

**Eventos que la disparan**

- `logout-all`
- reset de password
- cambio de password
- activacion de 2FA
- recovery de 2FA

**Flujo principal**

1. El backend incrementa `AccountMaster.tokenVersion`.
2. Los JWT viejos conservan el claim `ver` anterior.
3. El filtro compara `ver` del token con `tokenVersion` actual.
4. Si no coinciden, el token ya no autentica.

**Postcondiciones**

- Corte inmediato de sesiones basadas en access JWT preexistentes.

**Implementacion asociada**

- `AuthServiceImpl.revokeAllSessions()`
- `PasswordResetService.applyPasswordReset()`
- `AccountSecurityService.verifyTwoFactorSetup()`
- `AccountSecurityService.applyTwoFactorRecovery()`

---

## `CU-S07` Proteccion CSRF

**Objetivo**

Proteger requests mutantes hechos con cookies autenticadas.

**Actor principal**

- Backend Spring

**Flujo principal**

1. El backend genera `XSRF-TOKEN`.
2. Angular la lee desde cookie.
3. Angular reenvia el valor en `X-CSRF-TOKEN`.
4. `CsrfProtectionFilter` compara cookie y header.
5. Si coinciden, deja pasar el request.

**Detalle importante**

- `/api/auth/refresh` tambien queda protegido por CSRF.
- Login y register estan excluidos.

**Postcondiciones**

- Requests mutantes con cookies auth requieren prueba adicional anti-CSRF.

**Implementacion asociada**

- `CsrfCookieService`
- `CsrfProtectionFilter`
- `apiHttpInterceptor`
- `authRefreshInterceptor`

---

## `CU-S08` Autorizacion por roles

**Objetivo**

Controlar acceso a recursos protegidos segun rol.

**Actor principal**

- Backend Spring

**Flujo principal**

1. El filtro autentica la cuenta.
2. Spring construye authorities `ROLE_USER`, `ROLE_ADMIN`, etc.
3. `SecurityConfig` aplica `hasAnyRole(...)` segun endpoint.

**Reglas observadas**

- Recursos base de cuenta: `USER`, `ADMIN`, `SUPER_ADMIN`
- Admin notifications: `ADMIN`, `SUPER_ADMIN`

**Observacion tecnica**

- El frontend considera `MODERATOR` como rol privilegiado para UI.
- El backend no lo incluye en varios endpoints base.
- Si un moderador no tiene tambien `USER`, puede haber inconsistencia entre UI y permisos reales.

**Postcondiciones**

- La autorizacion final la define el backend, no el frontend.

**Implementacion asociada**

- `SecurityConfig`
- `JwtAuthenticationFilter`
- `AccountMasterDetailsService`

---

## `CU-S09` Rate limiting de auth

**Objetivo**

Reducir abuso sobre login, register, recovery, refresh y endpoints de sesion.

**Actor principal**

- Backend Spring

**Flujo principal**

1. `RateLimitFilter` resuelve politica segun endpoint.
2. Construye clave por IP y, cuando aplica, por email o principal.
3. Consume bucket de tokens.
4. Si excede limite:
   - responde `429`
   - envia `Retry-After`
   - envia `retryAfterSeconds`

**Postcondiciones**

- Los endpoints criticos quedan limitados por ventana temporal.

**Implementacion asociada**

- `RateLimitFilter`
- `RateLimitService`
- `RateLimitProperties`

---

## `CU-S10` Sincronizacion entre tabs y uso de `localStorage`

**Objetivo**

Sincronizar login/logout entre tabs sin guardar tokens en storage.

**Actor principal**

- Frontend Angular

**Flujo principal**

1. Cuando hay login/logout/logout-all, Angular publica evento por `BroadcastChannel`.
2. Ademas escribe de forma efimera en `localStorage`:
   - `terra.auth.sync`
3. Ese valor se usa solo para disparar el evento `storage` en otras tabs.
4. Luego se elimina enseguida.
5. Si hay rate limit de sesion, Angular guarda:
   - `terra.auth.session-rate-limit-until`
6. Ese valor es solo un timestamp de reintento.

**Aclaracion importante**

- No se guardan access token ni refresh token en `localStorage`.
- La sesion del frontend se conserva en memoria en `sessionSubject`.
- Los tokens reales viven solo en cookies del navegador.

**Postcondiciones**

- Las tabs se mantienen consistentes sin exponer credenciales en storage.

**Implementacion asociada**

- `AuthFacadeService`
