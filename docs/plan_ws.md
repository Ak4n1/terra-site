# Plan WS Senior

## Contexto

Proyecto objetivo:

- Frontend: `C:\Users\JeeP_\OneDrive\Escritorio\Terra-web-v2`
- Backend: `C:\Users\JeeP_\OneDrive\Escritorio\terra-api-v2\terra-api`

Base actual ya disponible:

- autenticacion por cookies `HttpOnly`
- `withCredentials: true` en Angular
- CSRF doble submit cookie/header
- refresh rotation
- revocacion de sesiones server-side
- CORS configurable por propiedades

Esto es una buena base para WebSocket seguro.

## Principio rector

No existe un WebSocket "invulnerable". Lo correcto a nivel senior es:

- minimizar superficie de ataque
- eliminar patrones inseguros conocidos
- endurecer autenticacion y origen
- soportar revocacion real
- controlar consumo y abuso
- dejar trazabilidad y observabilidad

## Decision principal

Para `terra-api` y `Terra-web-v2` recomiendo:

- mantener autenticacion por cookies `HttpOnly`
- no pasar JWT por query string
- no depender de `localStorage`
- usar WebSocket nativo con handshake autenticado por cookie
- validar origen exacto y estricto
- vincular cada conexion WS a una sesion de backend revocable
- usar un canal unidireccional server -> client para notificaciones/eventos
- dejar operaciones mutantes por HTTP salvo excepciones muy justificadas

## Veredicto de arquitectura

La mejor base entre los proyectos revisados, para tomar como referencia, es `portafolio/site-ak4n1 + portafolio/portafolio` en seguridad de handshake y origen.

Por que:

- no usa token por query string en el handshake
- valida origen de forma normalizada y exacta
- en produccion usa cookies mas estrictas
- el cliente WS es simple y consistente con cookies `HttpOnly`

Lo mejor en observabilidad es `api-terra`, porque agrega metricas y persistencia de sesiones, pero su validacion de origen y su aceptacion de token por query string lo hacen menos seguro que `portafolio`.

## Anti-patrones que NO vamos a repetir

1. Token en query string.
2. `origin.startsWith(...)` como validacion.
3. permitir `file://` como origin en backend web publico.
4. loggear cookies o fragmentos de JWT.
5. confiar solo en estado en memoria del nodo para algo revocable.
6. usar el socket para acciones mutantes si HTTP ya resuelve CSRF y auditoria mejor.
7. acoplar reglas de WS a valores hardcodeados por entorno.

## Arquitectura propuesta

### 1. Endpoint

- endpoint unico: `/api/ws`
- sin SockJS
- sin STOMP en la primera version
- subcanales logicos por tipo de evento dentro del payload

Motivo:

- menor complejidad
- menor overhead
- mejor control del protocolo
- encaja mejor con tu stack actual

### 2. Autenticacion del handshake

El handshake debe autenticar usando:

- cookie de access token `HttpOnly`
- opcionalmente validar tambien la sesion de refresh activa asociada al usuario si queres revocacion mas fuerte

Reglas:

- si no hay cookie de access token: rechazar
- si el access token expiro o es invalido: rechazar
- si el usuario esta deshabilitado: rechazar
- si la sesion del usuario fue revocada globalmente: cerrar
- nunca aceptar `token` por query param

### 3. Origin policy

Validacion exacta y normalizada:

- parsear `Origin` como URI
- normalizar esquema, host y puerto
- comparar contra lista permitida exacta
- nada de `startsWith`
- nada de wildcard con credenciales

Electron:

- no usar `file://`
- usar esquema propio tipo `app://terra-desktop`
- validar ese esquema explicitamente solo si existe cliente desktop real

### 4. Modelo de sesion WS

Persistir una sesion WS server-side:

- `id`
- `account_id`
- `node_id`
- `created_at`
- `last_seen_at`
- `closed_at`
- `client_ip`
- `user_agent_hash`
- `origin`
- `status`

No guardar:

- JWT raw
- cookies
- headers sensibles completos

Guardar la relacion de la conexion con:

- usuario
- sesion de cuenta vigente
- nodo actual

### 5. Autorizacion por canal/evento

El socket se abre autenticado, pero cada evento emitido por backend debe pasar por una politica de autorizacion:

- `notification.created` -> solo destinatario
- `notification.unread_count` -> solo destinatario
- `account.session.revoked` -> solo propietario
- `admin.broadcast` -> solo roles admin/moderador
- `payment.status.updated` -> solo propietario
- `security.alert` -> solo propietario

Nada de broadcast global salvo eventos publicos sin datos sensibles.

### 6. Contrato de mensajes

Payload envelope:

```json
{
  "id": "evt_01...",
  "type": "notification.created",
  "version": 1,
  "occurredAt": "2026-03-12T10:00:00Z",
  "traceId": "req_...",
  "data": {}
}
```

Campos obligatorios:

- `id`
- `type`
- `version`
- `occurredAt`
- `data`

Campos opcionales:

- `traceId`
- `requestId`

### 7. ACK y entrega

Para eventos relevantes:

- el cliente responde `ack`
- el servidor registra entrega logica

Pero:

- no usar el socket como cola garantizada
- la fuente de verdad sigue siendo HTTP + BD

Estrategia correcta:

- WS para baja latencia
- HTTP para rehidratacion y consistencia

Ejemplo:

- llega `notification.created`
- Angular actualiza UI
- si hubo desconexion, al reconectar hace `GET /api/notifications?since=...`

### 8. Revocacion y cierre forzado

Cuando pase cualquiera de estos casos:

- logout
- logout all
- refresh token revocado
- cambio de password
- cuenta bloqueada
- cambio de `tokenVersion`

el backend debe:

- invalidar sesiones HTTP
- marcar sesiones WS asociadas como revocadas
- cerrar sockets activos del usuario con codigo controlado

### 9. Heartbeat

Servidor:

- manda `ping` cada 25-30 segundos

Cliente:

- responde `pong`

Servidor:

- si no recibe `pong` dentro de ventana razonable, cierra

Agregar:

- contador de misses por sesion
- cierre por timeout

No dejar constantes muertas sin implementar.

### 10. Rate limiting y abuse control

Separar limites:

- intentos de handshake por IP
- handshakes por cuenta
- conexiones simultaneas por cuenta
- mensajes cliente -> servidor por minuto
- payload maximo por mensaje

Valores iniciales recomendados:

- handshake por IP: 20/min
- handshake por cuenta: 10/min
- conexiones simultaneas por cuenta: 3
- mensajes cliente -> servidor: 30/min
- payload maximo: 4 KB

Para admin panel, evaluar limites por rol.

### 11. Escalabilidad horizontal

No usar solo mapas en memoria como fuente unica.

Version objetivo:

- estado local de sockets por nodo
- Redis para fan-out/event bus
- tabla de sesiones WS para auditoria y cierre coordinado
- `node_id` para saber donde vive cada conexion

Patron:

1. API genera evento de dominio
2. publica en Redis topic
3. nodo con socket del usuario lo entrega
4. si no hay socket activo, no falla negocio

Esto evita sticky sessions como dependencia dura.

### 12. Seguridad de cookies

Mantener cookies para auth. Es correcto si:

- frontend y API estan same-origin o bajo reverse proxy controlado
- `Secure=true` en prod
- `HttpOnly=true` para auth
- `SameSite=Lax` o `Strict` segun topologia

Recomendacion para este proyecto:

- si `Terra-web-v2` y `terra-api` van same-origin con proxy `/api`: `SameSite=Lax`
- si van en subdominios separados y necesitas credenciales cross-site: `SameSite=None` + `Secure`, pero solo si realmente es necesario

Para WS:

- la cookie esta bien
- lo que no esta bien es extraer token desde query param

### 13. CSRF

CSRF no protege el handshake WS de la misma forma que HTTP mutante.

Por eso el control real en WS debe ser:

- cookie `HttpOnly`
- validacion estricta de `Origin`
- revocacion de sesion
- rate limiting

No recomiendo meter CSRF token en query string del WebSocket.

### 14. Observabilidad

Metricas minimas:

- conexiones abiertas
- handshakes aceptados
- handshakes rechazados por motivo
- tiempo medio de conexion
- eventos enviados por tipo
- eventos fallidos por tipo
- reconexiones cliente
- cierres por timeout
- cierres por revocacion

Logs:

- sin JWT
- sin cookies
- con `sessionId`, `accountId`, `nodeId`, `origin`, `reason`

Tracing:

- incluir `traceId` en mensajes emitidos por backend cuando nazcan desde request HTTP

### 15. Frontend Angular

Crear capa dedicada:

- `src/app/core/realtime/realtime.service.ts`
- `src/app/core/realtime/realtime-store.service.ts`
- `src/app/core/realtime/realtime.models.ts`

Responsabilidades:

- abrir/cerrar conexion
- reconexion con backoff real + jitter
- estado `disconnected|connecting|connected|degraded|revoked`
- parse seguro de eventos
- emitir a stores por feature

No acoplar el dropdown directo al socket.

Patron recomendado:

- `RealtimeService` recibe evento
- `NotificationsStore` actualiza estado
- componentes leen signals/observables del store

### 16. Integracion UX concreta en Terra-web-v2

Primera ola de eventos:

- `notification.created`
- `notification.read`
- `notification.unread_count`
- `account.session.revoked`
- `security.password_changed`
- `payment.status.updated`

Aplicacion inmediata:

- reemplazar mock de `notifications-dropdown.component.ts`
- badge real de no leidas
- dropdown rehidratado por HTTP al abrir
- socket solo actualiza incrementalmente

### 17. Backend Spring en terra-api

Paquetes sugeridos:

- `com.terra.api.realtime.config`
- `com.terra.api.realtime.websocket`
- `com.terra.api.realtime.service`
- `com.terra.api.realtime.dto`
- `com.terra.api.realtime.metrics`
- `com.terra.api.realtime.session`

Clases base:

- `WebSocketConfig`
- `WebSocketHandshakeInterceptor`
- `WebSocketAuthService`
- `RealtimeWebSocketHandler`
- `RealtimeSessionRegistry`
- `RealtimeEventPublisher`
- `RealtimeMetrics`

Reusar componentes existentes:

- `JwtService`
- `JwtProperties`
- `AccountSessionService`
- `CsrfProperties`
- `CorsProperties`

### 18. Reglas de implementacion obligatorias

1. No aceptar token por query string.
2. No usar `startsWith` para origin.
3. No usar `file://`.
4. No loggear secretos.
5. No mezclar DTO HTTP con DTO WS.
6. No emitir datos sensibles que no se muestren en UI.
7. No confiar solo en memoria local para revocacion.
8. No usar comentarios que prometen "exponencial" si el algoritmo es lineal.

## Roadmap de implementacion

### Fase 0. Decision de despliegue

Definir uno y solo uno:

- same-origin con reverse proxy
- subdominios separados
- soporte Electron real

Sin esto no se puede cerrar `SameSite`, `Origin` y `CORS` correctamente.

### Fase 1. Backend foundation

- crear modulo `realtime`
- crear endpoint `/api/ws`
- interceptor de handshake
- validacion por cookie `terra_access_token`
- origin exacto desde `CorsProperties`
- cierre si sesion revocada

### Fase 2. Session registry

- entidad `RealtimeSession`
- persistencia minima
- `node_id`
- `last_seen_at`
- estado abierto/cerrado/revocado

### Fase 3. Event model

- contrato envelope versionado
- tipos de evento
- serializer comun
- ack opcional

### Fase 4. Frontend realtime core

- `RealtimeService`
- reconexion con jitter
- estado observable/signal
- cierre por revocacion
- rehidratacion por HTTP

### Fase 5. Notifications

- API `GET /api/notifications`
- API `POST /api/notifications/{id}/read`
- eventos `notification.created` y `notification.unread_count`
- reemplazo del mock actual

### Fase 6. Observabilidad

- metricas micrometer
- logs estructurados
- dashboard operativo
- alertas basicas

### Fase 7. Escalado

- Redis pub/sub
- fan-out inter-nodo
- cierre coordinado por usuario

## Criterios de aceptacion

1. Un usuario autenticado abre WS solo con cookies.
2. Un origin no permitido es rechazado.
3. Un logout-all cierra todos los sockets del usuario.
4. Un token revocado invalida el socket activo.
5. El dropdown de notificaciones deja de ser mock.
6. Una caida breve de red reconecta sin duplicar eventos visibles.
7. Dos nodos distintos pueden entregar eventos al mismo usuario via Redis.
8. No aparece ningun JWT en logs.

## Mi recomendacion final

La forma correcta para tu stack actual es:

- cookies `HttpOnly` para autenticar el WebSocket
- `Origin` exacto y estricto
- cero token en query string
- eventos server -> client
- HTTP para mutaciones
- sesiones WS revocables y observables
- Redis al pasar a multi-instancia

Ese es el diseño que mejor encaja con tu frontend Angular actual y con tu backend Spring actual sin degradar la seguridad ya conseguida con cookies, CSRF y refresh rotation.
