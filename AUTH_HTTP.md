# Auth HTTP

## Objetivo

El frontend Angular debe enviar siempre lo necesario para que la API funcione con:

- cookies `HttpOnly`
- i18n por header
- proteccion CSRF

## Reglas

### 1. `withCredentials`

Todos los requests al backend propio deben salir con:

```ts
withCredentials: true
```

Esto es obligatorio porque la autenticacion usa cookies.

### 2. Idioma

Angular debe enviar siempre el idioma actual:

- `X-Language`
- opcionalmente tambien `Accept-Language`

Si no hay idioma seleccionado:

- usar `us`

### 3. CSRF

La API ahora usa:

- cookie: `XSRF-TOKEN`
- header: `X-CSRF-TOKEN`

Para requests mutantes:

- `POST`
- `PUT`
- `PATCH`
- `DELETE`

Angular debe:

1. leer la cookie `XSRF-TOKEN`
2. enviar su valor en el header `X-CSRF-TOKEN`

Sin eso, endpoints como:

- `/api/auth/refresh`
- `/api/auth/logout`

van a fallar.

## Recomendacion

Resolver todo con un interceptor HTTP:

- `withCredentials: true`
- `X-Language`
- `X-CSRF-TOKEN`

## Flujo esperado

1. `login`
2. backend responde con cookies:
   - access token
   - refresh token
   - `XSRF-TOKEN`
3. Angular guarda nada de auth en localStorage
4. Angular manda cookies automaticamente
5. Angular manda `X-CSRF-TOKEN` en requests mutantes
