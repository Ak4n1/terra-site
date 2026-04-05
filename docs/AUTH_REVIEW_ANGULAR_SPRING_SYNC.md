## Hallazgos

1. Persistencia local demasiado confiada en Angular

- El guard puede dar acceso visual al dashboard con una sesion cacheada que ya no existe en el backend.
- En el frontend, `sessionSubject` arranca desde `localStorage` y `ensureAuthenticated()` devuelve `true` inmediatamente si hay cache, sin revalidar primero contra `/me`.
- Referencias:
  - `src/app/features/auth/services/auth-facade.service.ts`
  - `src/app/features/auth/guards/auth.guard.ts`
  - `src/app/features/dashboard/routes.ts`
- Impacto:
  - No es un bypass real de seguridad porque el backend sigue protegiendo `/me` y `/logout-all`.
  - Si es un desajuste de estado frontend/backend: el usuario puede ver pantalla privada antes de que el frontend descubra que la sesion real ya no existe.
- Estado:
  - Resuelto.
  - Se elimino la persistencia de `terra.auth.session-cache`.
  - Angular ahora reconstruye la sesion solo desde cookies + `/me` + `/refresh`.

2. Contrato CSRF acoplado por strings hardcodeados en Angular

- Angular usa fijo `XSRF-TOKEN` y `X-CSRF-TOKEN`.
- Spring permite configurar esos nombres con `csrf.cookie-name` y `csrf.header-name`.
- Referencias:
  - `src/app/core/http/interceptors/api-http.interceptor.ts`
  - `src/main/resources/application.properties`
  - `src/main/java/com/terra/api/security/config/CsrfProperties.java`
- Impacto:
  - Hoy coincide y funciona.
  - Si backend cambia esos nombres por entorno o configuracion, el frontend se rompe sin una señal de compilacion ni contrato compartido.
- Estado:
  - Resuelto.
  - Spring ahora expone una config publica minima con los nombres CSRF y Angular la carga al iniciar con fallback seguro a los valores actuales.

3. Desajuste de tipos en refresh de sesion

- Angular declara `refreshSession(): Observable<ApiResponse<null>>`.
- Spring devuelve `ApiResponse<RefreshSessionResponse>`.
- Referencias:
  - `src/app/features/auth/services/auth.service.ts`
  - `src/main/java/com/terra/api/auth/controller/AuthController.java`
  - `src/main/java/com/terra/api/auth/dto/RefreshSessionResponse.java`
- Impacto:
  - No rompe hoy porque Angular no usa `response.data` en refresh.
  - El contrato HTTP no esta limpio ni expresado igual en ambos lados.
- Estado:
  - Resuelto.
  - Angular ahora tipa `/refresh` como `ApiResponse<RefreshSessionResponse>`.

4. Produccion depende de topologia same-origin o proxy correcto

- Angular en produccion usa `apiBaseUrl: ''`.
- Spring en produccion emite cookies con `Secure=true` y `SameSite=Lax`.
- Referencias:
  - `src/environments/environment.production.ts`
  - `src/main/resources/application-prod.properties`
- Impacto:
  - Esta bien si frontend y API viven bajo el mismo origen o si `/api` pasa por proxy del mismo host.
  - Si se separan en subdominios u origenes distintos, la integracion actual no esta preparada de forma explicita.
- Estado:
  - Pendiente.
  - No se modifico la topologia esperada de despliegue.

## Flujo actual

### 1. Login

- Angular hace `POST /api/auth/login` con credenciales y `withCredentials: true`.
- El interceptor agrega idioma y, si corresponde, CSRF. En login no hace falta CSRF porque Spring lo excluye.
- Spring autentica email/password.
- Si la cuenta esta verificada:
  - genera access token
  - genera refresh token
  - guarda o crea sesion de refresh
  - devuelve cookies `HttpOnly` para access y refresh
  - devuelve cookie CSRF legible por JS
  - responde con el usuario en `ApiResponse<AuthSessionResponse>`
- Angular guarda `response.data` en memoria y tambien en `localStorage`.

### 2. Bootstrap y `/me`

- Al iniciar la app, Angular ejecuta `bootstrapSession()`.
- Si no hay rate limit activo, intenta `GET /api/auth/me`.
- Spring resuelve autenticacion leyendo el access token desde cookie.
- Si el token access es valido, `/me` responde con el usuario actual.
- Angular actualiza su sesion local con esa respuesta.

### 3. Refresh

- Si `/me` devuelve `401`, Angular intenta `POST /api/auth/refresh`.
- Spring toma el refresh token desde cookie, valida:
  - que exista
  - que la sesion siga activa
  - que el token sea valido
  - que el `tokenVersion` coincida
- Si todo da bien:
  - rota refresh token
  - emite nuevo access token
  - emite nuevo refresh token
  - emite nuevo CSRF token
- Angular luego vuelve a pedir `/me` para reconstruir la sesion.

### 4. Logout

- Angular llama `POST /api/auth/logout`.
- Spring revoca la sesion asociada al refresh token actual si existe.
- Spring limpia cookies de auth y cookie CSRF.
- Angular limpia cache local y sincroniza logout entre pestañas.

### 5. Logout all

- Angular llama `POST /api/auth/logout-all`.
- Spring incrementa `tokenVersion` y revoca todas las sesiones guardadas.
- Eso invalida access y refresh previos.
- Spring limpia cookies.
- Angular limpia cache local y sincroniza logout entre pestañas.

## Evaluacion general

- La arquitectura base esta bien resuelta:
  - cookies `HttpOnly` para JWT
  - CSRF doble cookie/header
  - refresh con rotacion
  - revocacion global por `tokenVersion`
  - backend como fuente real de verdad
- Lo mas flojo no es la seguridad base del backend sino la sincronizacion de estado en Angular:
  - el despliegue productivo sigue dependiendo de same-origin o proxy correcto
  - el rate limit sobre `/me` y `/refresh` puede sentirse durante recargas agresivas

## Nota sobre F5

- El problema de apretar muchas veces `F5` no justificaba guardar la sesion en `localStorage`.
- El comportamiento observado encaja mejor con la proteccion existente de rate limit:
  - `/api/auth/me` usa `auth-session-read`
  - `/api/auth/refresh` usa `auth-session-refresh`
- Angular ya tiene una mitigacion especifica para eso:
  - guarda solo `terra.auth.session-rate-limit-until`
  - evita reintentar inmediatamente
  - reprograma el bootstrap cuando pasa la ventana de espera
- Esa persistencia de rate limit es mucho menos riesgosa que persistir el perfil del usuario.
- Estado:
  - Mejorado.
  - El guard ahora espera la recuperacion del rate limit antes de decidir acceso si la sesion todavia esta en resolucion.
  - La UI ahora muestra estados explicitos de verificacion o reconexion de sesion en lugar de asumir login/logout de forma prematura.

## Que haria despues

1. Medir en entorno real si el tiempo de espera del rate limit necesita ajustes finos de UX o politicas.
2. Definir explicitamente la topologia productiva esperada: same-origin, reverse proxy o multi-subdominio.
