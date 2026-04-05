# Alerts En Frontend

## Objetivo

El frontend no debe depender de un campo visual como `type` enviado por la API.

La API debe enviar:

- `code`
- `message`
- HTTP status

Y Angular debe resolver la variante visual de la alerta a partir de eso.

## Regla General

El componente `ui-alert` ya soporta estas variantes:

- `warning`
- `error`
- `success`

La decision visual debe salir de un mapper central del frontend.

## Criterio De Resolucion

1. si la respuesta fue exitosa y hay mensaje de exito, usar `success`
2. si el `code` pertenece a una lista de codigos no fatales, usar `warning`
3. si el HTTP status es `>= 400` y el `code` no esta en la lista de warnings, usar `error`
4. si no hay coincidencia, fallback a `warning`

## Codigos Que Deben Renderizarse Como `warning`

Lista inicial propuesta:

```text
auth.email_not_verified
auth.verification_pending
auth.verification_required
auth.account_pending_verification
auth.password_reset_already_sent
auth.verification_email_already_sent
auth.deactivation_code_already_sent
auth.game_account_code_already_sent
rate_limit.exceeded
rate_limit.too_many_requests
validation.failed
validation.partial
news.translation_fallback_used
content.translation_fallback_used
content.language_not_available
notifications.none_unread
notifications.already_read
market.no_results
search.no_results
payments.pending
payments.requires_action
payments.already_processed
withdrawal.code_already_sent
withdrawal.permission_already_exists
withdrawal.permission_not_found
system.retry_later
system.temporarily_unavailable
```

## Casos Que Deben Ir Como `error`

Ejemplos tipicos:

```text
auth.invalid_credentials
auth.user_not_found
auth.user_disabled
auth.token_invalid
auth.token_expired
auth.refresh_token_invalid
auth.refresh_token_expired
auth.refresh_token_reused
validation.invalid_request
payments.failed
payments.refused
payments.provider_error
permissions.forbidden
resource.not_found
system.internal_error
system.unexpected_error
```

## Casos Que Deben Ir Como `success`

Ejemplos:

```text
auth.login_success
auth.logout_success
auth.password_changed
auth.verification_email_sent
auth.password_reset_sent
auth.account_created
game.account_created
news.created
news.updated
notifications.read_all_success
payments.preference_created
withdrawal.code_sent
```

## Contrato Esperado De La API

Ejemplo de error no fatal:

```json
{
  "code": "auth.email_not_verified",
  "message": "Debes verificar tu correo antes de continuar"
}
```

Ejemplo de error fatal:

```json
{
  "code": "auth.invalid_credentials",
  "message": "Credenciales invalidas"
}
```

Ejemplo de exito:

```json
{
  "code": "auth.login_success",
  "message": "Sesion iniciada correctamente"
}
```

## Mapper Recomendado En Angular

Crear un mapper central, por ejemplo:

- `src/app/core/http/alert-code.mapper.ts`

Ejemplo:

```ts
export type AlertVariant = 'warning' | 'error' | 'success';

const WARNING_CODES = new Set<string>([
  'auth.email_not_verified',
  'auth.verification_pending',
  'auth.verification_required',
  'auth.account_pending_verification',
  'auth.password_reset_already_sent',
  'auth.verification_email_already_sent',
  'auth.deactivation_code_already_sent',
  'auth.game_account_code_already_sent',
  'rate_limit.exceeded',
  'rate_limit.too_many_requests',
  'validation.failed',
  'validation.partial',
  'news.translation_fallback_used',
  'content.translation_fallback_used',
  'content.language_not_available',
  'notifications.none_unread',
  'notifications.already_read',
  'market.no_results',
  'search.no_results',
  'payments.pending',
  'payments.requires_action',
  'payments.already_processed',
  'withdrawal.code_already_sent',
  'withdrawal.permission_already_exists',
  'withdrawal.permission_not_found',
  'system.retry_later',
  'system.temporarily_unavailable'
]);

const SUCCESS_CODES = new Set<string>([
  'auth.login_success',
  'auth.logout_success',
  'auth.password_changed',
  'auth.verification_email_sent',
  'auth.password_reset_sent',
  'auth.account_created',
  'game.account_created',
  'news.created',
  'news.updated',
  'notifications.read_all_success',
  'payments.preference_created',
  'withdrawal.code_sent'
]);

export function resolveAlertVariant(code: string | null | undefined, status: number): AlertVariant {
  if (code && SUCCESS_CODES.has(code)) {
    return 'success';
  }

  if (code && WARNING_CODES.has(code)) {
    return 'warning';
  }

  if (status >= 400) {
    return 'error';
  }

  return 'warning';
}
```

## Regla De Mantenimiento

Cada vez que backend agregue un nuevo `code`, el frontend debe decidir explicitamente:

1. si es `success`
2. si es `warning`
3. si cae en `error` por default

No conviene dejar esta logica dispersa por componentes o paginas.

## Decision

El frontend debe determinar la variante visual de la alerta usando:

- `code`
- HTTP status

No debe depender de un `type` visual enviado por la API.
