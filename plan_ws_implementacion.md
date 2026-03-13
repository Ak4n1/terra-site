# Plan WS Implementacion

## Objetivo

Implementar WebSocket en:

- Frontend: `C:\Users\JeeP_\OneDrive\Escritorio\Terra-web-v2`
- Backend: `C:\Users\JeeP_\OneDrive\Escritorio\terra-api-v2\terra-api`

siguiendo el diseño definido en `plan_ws.md`, con nivel senior, sin atajos inseguros y sin introducir deuda técnica estructural.

## Resultado esperado

Al finalizar la implementación:

- el sistema tendrá un canal WebSocket seguro y estable
- la autenticación del socket usará cookies `HttpOnly`
- no se usará token en query string
- la validación de `Origin` será exacta
- las sesiones WebSocket serán revocables
- el frontend tendrá una capa realtime desacoplada
- las notificaciones dejarán de ser mock en la UI
- la solución estará preparada para escalar a múltiples nodos

## Reglas obligatorias

1. No aceptar JWT por query string.
2. No usar `startsWith` para validar `Origin`.
3. No permitir `file://`.
4. No loggear cookies, JWT ni fragmentos de JWT.
5. No dejar la autorización de eventos solo al handshake.
6. No usar el socket para mutaciones si HTTP actual ya resuelve mejor seguridad y auditoría.
7. No romper el modelo actual de cookies + CSRF + refresh rotation.
8. No introducir dependencia de `localStorage` para auth del socket.
9. No acoplar componentes visuales directo al transporte WS.
10. No dejar estado crítico solo en memoria si luego debe ser revocable o coordinable.

## Orden de implementación

La implementación debe hacerse en este orden exacto:

1. Backend foundation
2. Backend session model
3. Backend auth handshake
4. Backend event contract
5. Frontend realtime core
6. Notifications integration
7. Observabilidad
8. Hardening final

## Fase 1. Backend Foundation

### Objetivo

Crear la base del módulo realtime en `terra-api`.

### Crear paquete

- `com.terra.api.realtime.config`
- `com.terra.api.realtime.websocket`
- `com.terra.api.realtime.dto`
- `com.terra.api.realtime.service`
- `com.terra.api.realtime.session`
- `com.terra.api.realtime.metrics`

### Crear clases mínimas

- `WebSocketConfig`
- `RealtimeWebSocketHandler`
- `WebSocketHandshakeInterceptor`
- `RealtimeEventMessage`
- `RealtimeSessionRegistry`

### Endpoint inicial

- endpoint único: `/api/ws`

### Criterios de aceptación

- el proyecto compila
- el endpoint WS existe
- el handler está registrado
- no se expone todavía lógica de negocio

## Fase 2. Session Model

### Objetivo

Persistir sesiones WebSocket de forma mínima, segura y útil.

### Crear entidad

- `RealtimeSession`

### Campos recomendados

- `id`
- `accountId`
- `nodeId`
- `status`
- `origin`
- `clientIp`
- `userAgentHash`
- `connectedAt`
- `lastSeenAt`
- `closedAt`
- `closeReason`

### No guardar

- JWT raw
- cookies
- headers completos

### Crear repositorio

- `RealtimeSessionRepository`

### Crear servicio

- `RealtimeSessionService`

Responsabilidades:

- abrir sesión
- actualizar `lastSeenAt`
- cerrar sesión
- cerrar todas las sesiones de un usuario
- buscar sesiones activas por usuario

### Criterios de aceptación

- cada conexión aceptada genera sesión persistida
- cada desconexión marca `closedAt` y `closeReason`
- no hay secretos persistidos

## Fase 3. Auth Handshake

### Objetivo

Hacer que el handshake sea seguro y coherente con el sistema actual de auth.

### Fuente de autenticación

Usar exclusivamente:

- cookie de access token actual del backend

### Reusar servicios existentes

- `JwtService`
- `JwtProperties`
- `AccountSessionService`

### Lógica del interceptor

1. Leer `Origin`
2. Normalizar `Origin`
3. Comparar exacto contra orígenes permitidos configurados
4. Leer cookie de access token
5. Validar JWT
6. Validar usuario activo
7. Validar sesión vigente/revocación
8. Aplicar rate limit IP
9. Aplicar rate limit por cuenta
10. Crear `RealtimeSession`
11. Inyectar atributos mínimos al handler

### Atributos permitidos en sesión

- `realtimeSessionId`
- `accountId`
- `accountEmail`
- `roles`
- `origin`

### Prohibido

- guardar token completo en atributos si no es estrictamente necesario

Si se necesita trazabilidad de token:

- guardar hash temporal
- nunca el valor raw

### Criterios de aceptación

- conexión sin cookie: rechazada
- conexión con origin inválido: rechazada
- conexión con token inválido: rechazada
- conexión de usuario bloqueado: rechazada
- conexión de usuario revocado: rechazada

## Fase 4. Event Contract

### Objetivo

Definir un protocolo WS mantenible y versionable.

### DTO principal

- `RealtimeEventMessage`

### Estructura

```json
{
  "id": "evt_xxx",
  "type": "notification.created",
  "version": 1,
  "occurredAt": "2026-03-12T10:00:00Z",
  "traceId": "req_xxx",
  "data": {}
}
```

### Tipos iniciales

- `notification.created`
- `notification.unread_count`
- `notification.read`
- `account.session.revoked`
- `security.password_changed`
- `payment.status.updated`
- `system.ping`
- `system.refresh_required`
- `system.shutdown`

### Mensajes client -> server permitidos

Solo los mínimos:

- `system.pong`
- `notification.ack`

No habilitar otros mensajes hasta tener caso real.

### Criterios de aceptación

- todos los mensajes usan envelope único
- hay enum o catálogo tipado
- no hay strings mágicos dispersos

## Fase 5. Realtime Session Registry

### Objetivo

Tener una capa runtime para mapear conexiones vivas por nodo.

### Crear servicio

- `RealtimeSessionRegistry`

### Responsabilidades

- registrar socket vivo por `realtimeSessionId`
- indexar por `accountId`
- remover al cerrar
- enviar evento a una cuenta
- cerrar sockets de una cuenta
- reportar conteos

### Estructuras concurrentes

Usar estructuras seguras:

- `ConcurrentHashMap`
- sets concurrentes reales
- nunca `HashSet` mutado desde varios hilos

### Criterios de aceptación

- múltiples pestañas del mismo usuario funcionan
- el contador por cuenta es consistente
- no hay estructuras no thread-safe

## Fase 6. Handler Runtime

### Objetivo

Implementar el ciclo de vida real del socket.

### `RealtimeWebSocketHandler`

Debe manejar:

- `afterConnectionEstablished`
- `handleTextMessage`
- `afterConnectionClosed`
- `handleTransportError`

### Agregar

- heartbeat server -> client
- `pong` timeout real
- cierre por inactividad
- cierre por revocación

### Reglas

- actualizar `lastSeenAt`
- no dejar constantes sin usar
- no hacer sleeps en loops de cierre

### Criterios de aceptación

- el socket se mantiene estable
- el ping/pong funciona de verdad
- un cliente muerto se remueve
- un logout-all cierra el socket

## Fase 7. Publicador de eventos

### Objetivo

Desacoplar negocio de transporte.

### Crear servicio

- `RealtimeEventPublisher`

### Responsabilidades

- publicar evento a una cuenta
- publicar evento a múltiples cuentas
- preparar soporte multi-nodo

### Regla

Los servicios de negocio no deben hablar con el handler directamente.

Deben hablar con:

- `RealtimeEventPublisher`

### Criterios de aceptación

- notificaciones y otros módulos no conocen detalles del socket
- el transporte queda encapsulado

## Fase 8. Integración de Notificaciones en Backend

### Objetivo

Conectar el módulo de notificaciones actual al realtime.

### Implementar

- cuando se crea notificación: emitir `notification.created`
- cuando cambia contador: emitir `notification.unread_count`

### Regla de consistencia

WS notifica el cambio.
HTTP sigue siendo fuente de verdad.

### Criterios de aceptación

- una notificación nueva actualiza al usuario conectado
- si el usuario no está conectado, no falla la operación

## Fase 9. Frontend Realtime Core

### Objetivo

Crear una capa limpia en Angular.

### Crear archivos

- `src/app/core/realtime/realtime.models.ts`
- `src/app/core/realtime/realtime.service.ts`
- `src/app/core/realtime/realtime-store.service.ts`

### `realtime.models.ts`

Debe definir:

- tipos de eventos
- estado de conexión
- envelope tipado

### `realtime.service.ts`

Responsabilidades:

- abrir conexión
- cerrar conexión
- reconectar con backoff + jitter
- emitir estado
- parsear mensajes
- responder `pong`

### `realtime-store.service.ts`

Responsabilidades:

- exponer signals/observables de estado
- redistribuir eventos por feature
- ocultar detalles del transporte

### Regla

El componente visual no debe crear `new WebSocket(...)`.

### Criterios de aceptación

- la app abre WS solo si el usuario está autenticado
- la app cierra WS al logout
- la reconexión no duplica conexiones

## Fase 10. Integración con Auth Angular

### Objetivo

Alinear realtime con la sesión actual.

### Integrar con

- facade auth actual
- bootstrap de sesión
- logout
- logout-all
- refresh

### Regla

El WS debe iniciar solo cuando la sesión backend está confirmada.

No debe iniciar por cache visual.

### Criterios de aceptación

- no abre socket durante estado ambiguo de sesión
- después de refresh, el socket sigue sano o reconecta
- después de logout se cierra siempre

## Fase 11. Notifications UI

### Objetivo

Reemplazar el mock del dropdown actual.

### Componentes afectados

- `notifications-dropdown.component.ts`
- topbar/dashboard related UI

### Implementar

- leer notificaciones reales desde store
- badge de no leídas real
- lista real
- rehidratación por HTTP al abrir o al montar

### Regla de UX

- WS actualiza incrementalmente
- HTTP reconstruye estado completo

### Criterios de aceptación

- desaparece el array hardcodeado
- el contador refleja backend real
- los eventos WS actualizan UI sin recargar

## Fase 12. Hardening

### Objetivo

Cerrar agujeros antes de considerar terminado.

### Aplicar

- límite de payload
- límite de mensajes cliente -> servidor
- cierre con códigos razonables
- logs estructurados sin secretos
- validación estricta de tipos
- limpieza robusta ante errores

### Revisar

- no usar `startsWith` en origin
- no usar `file://`
- no usar token en query string
- no dejar DTOs de prueba ni endpoints de test abiertos

### Criterios de aceptación

- revisión de seguridad interna sin findings críticos

## Fase 13. Observabilidad

### Objetivo

Medir la capa realtime como un sistema serio.

### Crear métricas

- conexiones activas
- handshakes aceptados
- handshakes rechazados por razón
- eventos enviados por tipo
- eventos fallidos por tipo
- cierres por timeout
- cierres por revocación
- reconexiones

### Crear logs

Campos mínimos:

- `realtimeSessionId`
- `accountId`
- `nodeId`
- `eventType`
- `closeReason`
- `origin`

### Criterios de aceptación

- se puede diagnosticar por qué falló una conexión
- no hay secretos en logs

## Fase 14. Preparación Multi-Nodo

### Objetivo

No dejar la implementación atada a un solo nodo.

### Dejar preparados

- `nodeId` configurable
- interfaz de `RealtimeEventPublisher`
- punto de extensión Redis pub/sub

### Si se implementa Redis ahora

Agregar:

- publisher Redis
- consumer Redis
- entrega local por nodo

### Criterios de aceptación

- el diseño soporta horizontal scaling sin reescritura mayor

## Testing requerido

## Backend

### Unit tests

- normalización de `Origin`
- rechazo de origin inválido
- rechazo de cookie ausente
- rechazo de token inválido
- revocación de sesión WS
- rate limit

### Integration tests

- handshake exitoso
- handshake rechazado
- envío de `notification.created`
- cierre en logout-all

## Frontend

### Unit tests

- parseo de eventos
- reconexión
- cierre al logout
- actualización de store

### Integration tests

- dropdown actualizado desde store
- reconexión sin duplicación

## Definition of Done

Una fase se considera terminada solo si:

1. Compila.
2. Tiene tests razonables.
3. No rompe auth actual.
4. No introduce secretos en logs.
5. Tiene comportamiento claro en error.
6. Está alineada con `plan_ws.md`.

## Instrucción para Codex

Implementar por fases pequeñas y verificables.

No hacer todo junto.

Orden obligatorio sugerido para los próximos turnos:

1. Crear módulo backend `realtime` base.
2. Implementar handshake seguro con cookies.
3. Implementar `RealtimeSession` persistida.
4. Implementar `RealtimeService` Angular.
5. Reemplazar mock de notificaciones por datos reales.
6. Agregar tests.
7. Agregar métricas y hardening.

## Prioridad inmediata

La primera entrega concreta debe dejar listo:

- endpoint `/api/ws`
- handshake seguro sin query token
- validación estricta de `Origin`
- sesión WS persistida
- `RealtimeService` Angular conectado a sesión real

Sin eso, no tiene sentido conectar la UI final.
