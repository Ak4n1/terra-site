# plan_notificaciones_custom_multidioma.md

## Objetivo

Evolucionar el sistema actual de notificaciones para soportar contenido custom multi idioma sin romper el catalogo actual basado en `template + params`.

La base ya quedo preparada con:

- catalogo controlado de plantillas
- `preferred_language` persistido en `account_master`
- endpoint admin para envio individual y broadcast por rol o segmento
- frontend que traduce notificaciones de plantilla con `LanguageService`

## Decision principal

La etapa 2 no debe reemplazar el modelo actual.

La arquitectura correcta es **hibrida**:

1. mantener `TEMPLATE` para notificaciones de negocio y sistema controlado
2. agregar `CUSTOM_I18N` para notificaciones redactadas desde admin

Esto evita degradar el dominio actual a un sistema de texto libre y mantiene:

- consistencia
- multi idioma limpio
- trazabilidad
- compatibilidad hacia atras

## Por que no usar el header del frontend

El header del request no es una fuente confiable para decidir el idioma final persistido de una notificacion porque:

- representa al cliente que hizo la request, no al destinatario
- no sirve para broadcast
- no sirve para jobs internos
- no sirve para acciones administrativas sobre terceros

La fuente correcta del idioma preferido del usuario es `account_master.preferred_language`.

## Estado actual

### Backend actual

- `account_notification` guarda:
  - `title_key`
  - `body_key`
  - `params_json`
- `account_master` ya guarda `preferred_language`
- admin puede:
  - listar plantillas
  - enviar notificaciones a un usuario
  - hacer broadcast por rol o segmento

### Frontend actual

- el dropdown ya consume notificaciones persistidas
- las notificaciones `TEMPLATE` se renderizan con:
  - `LanguageService.t(titleKey, params)`
  - `LanguageService.t(bodyKey, params)`
- el idioma seleccionado en UI se sincroniza con backend

## Modelo de datos recomendado

Extender `account_notification` con estas columnas:

- `content_mode` `VARCHAR(24)` `NOT NULL`
  - valores:
    - `TEMPLATE`
    - `CUSTOM_I18N`
- `title_i18n_json` `TEXT NULL`
- `body_i18n_json` `TEXT NULL`
- `fallback_language` `VARCHAR(8) NULL`

### Reglas de persistencia

#### Si `content_mode = TEMPLATE`

- `title_key` requerido
- `body_key` requerido
- `params_json` permitido
- `title_i18n_json` debe ser `NULL`
- `body_i18n_json` debe ser `NULL`
- `fallback_language` debe ser `NULL`

#### Si `content_mode = CUSTOM_I18N`

- `title_key` debe ser `NULL`
- `body_key` debe ser `NULL`
- `params_json` debe ser `NULL` o vacio
- `title_i18n_json` requerido
- `body_i18n_json` requerido
- `fallback_language` requerido

## Contrato backend futuro

El DTO de salida debe evolucionar a este modelo comun:

```json
{
  "id": "ntf_...",
  "type": "admin.custom_multilingual",
  "category": "SYSTEM",
  "severity": "info",
  "contentMode": "CUSTOM_I18N",
  "titleKey": null,
  "bodyKey": null,
  "params": {},
  "titleI18n": {
    "es": "Mantenimiento extraordinario",
    "us": "Extraordinary maintenance"
  },
  "bodyI18n": {
    "es": "El servicio se detendra durante 20 minutos.",
    "us": "The service will stop for 20 minutes."
  },
  "fallbackLanguage": "us",
  "status": "UNREAD",
  "occurredAt": "2026-03-12T23:10:00Z",
  "readAt": null
}
```

### Compatibilidad

Las notificaciones actuales no deben cambiar su semantica.

Para `TEMPLATE`:

- seguir exponiendo `titleKey`
- seguir exponiendo `bodyKey`
- seguir exponiendo `params`

Para `CUSTOM_I18N`:

- exponer `titleI18n`
- exponer `bodyI18n`
- exponer `fallbackLanguage`

## Resolucion de idioma en frontend

### Reglas para `TEMPLATE`

Seguir igual:

1. leer `titleKey`
2. leer `bodyKey`
3. traducir con `LanguageService`

### Reglas para `CUSTOM_I18N`

Resolver en este orden:

1. `titleI18n[currentLanguage]` y `bodyI18n[currentLanguage]`
2. `titleI18n[userPreferredLanguage]` y `bodyI18n[userPreferredLanguage]`
3. `titleI18n[fallbackLanguage]` y `bodyI18n[fallbackLanguage]`
4. `titleI18n["us"]` y `bodyI18n["us"]`
5. primer valor disponible del mapa

### Motivo

Con esto:

- el usuario ve la notificacion en su idioma actual si existe
- si cambia de idioma, la UI puede re-renderizar sin pedir otra notificacion
- si falta una traduccion, existe degradacion controlada

## Catalogo y custom deben convivir

No se debe permitir que una notificacion custom reemplace una plantilla existente.

Separacion correcta:

- `system.test_notification`: `TEMPLATE`
- `account.welcome_registered`: `TEMPLATE`
- `system.maintenance_scheduled`: `TEMPLATE`
- `admin.custom_announcement`: `CUSTOM_I18N`

La UI admin debe dejar explicito el modo elegido.

## UI admin futura

La pantalla admin debe ofrecer dos modos de envio:

### Modo 1: `Template`

- seleccion de plantilla existente
- carga estructurada de parametros
- preview por idioma opcional

### Modo 2: `Custom multi idioma`

- formulario por idioma soportado:
  - `es`
  - `us`
  - `pt`
  - `fr`
  - `de`
- campos:
  - `title`
  - `body`
- seleccion de `fallbackLanguage`
- objetivo:
  - un usuario por email
  - broadcast por rol
  - broadcast por segmento

## Validaciones backend futuras

### Validaciones generales

1. rechazar payload mixto entre `TEMPLATE` y `CUSTOM_I18N`
2. limitar longitud maxima por idioma
3. sanitizar espacios y texto vacio
4. registrar `created_by_account_id` para auditoria

### Validaciones de `CUSTOM_I18N`

1. exigir al menos un idioma en `title_i18n_json`
2. exigir al menos un idioma en `body_i18n_json`
3. exigir que `fallback_language` exista dentro del contenido disponible
4. exigir que al menos un par `title/body` exista para el mismo idioma
5. rechazar mapas vacios

## Broadcast en etapa 2

El broadcast por rol o segmento ya existe y debe reutilizarse.

La evolucion correcta es:

1. mantener el mismo endpoint admin de broadcast
2. extender el request con `contentMode`
3. si `contentMode = TEMPLATE`, usar el flujo actual
4. si `contentMode = CUSTOM_I18N`, persistir la carga multi idioma por destinatario

No hace falta duplicar endpoints.
Hace falta extender el contrato con cuidado.

## Endpoint admin futuro

El request admin futuro deberia poder aceptar:

```json
{
  "contentMode": "CUSTOM_I18N",
  "targetType": "ROLE",
  "targetValue": "USER",
  "category": "SYSTEM",
  "severity": "info",
  "titleI18n": {
    "es": "Anuncio especial",
    "us": "Special announcement"
  },
  "bodyI18n": {
    "es": "Habra mantenimiento breve.",
    "us": "There will be a short maintenance."
  },
  "fallbackLanguage": "us"
}
```

## SQL manual futuro

Como este proyecto no usa migraciones, en produccion habra que agregar un script manual versionado en `docs/sql/`, por ejemplo:

- `account_notification_custom_i18n.sql`

Ese script deberia:

1. agregar `content_mode`
2. agregar `title_i18n_json`
3. agregar `body_i18n_json`
4. agregar `fallback_language`
5. backfillear `content_mode = TEMPLATE` para datos existentes

## Orden recomendado de implementacion

1. extender tabla `account_notification`
2. extender entidad y DTO backend
3. agregar mapper `CUSTOM_I18N`
4. extender endpoint admin individual
5. extender endpoint admin broadcast
6. adaptar store/frontend para ambos modos
7. agregar preview admin
8. agregar auditoria
9. agregar tests de fallback y broadcast multi idioma

## Riesgos

### Riesgo 1: payload demasiado grande

Mitigacion:

- limites por campo
- limites por idioma
- limites por cantidad de idiomas cargados

### Riesgo 2: traducciones parciales

Mitigacion:

- `fallbackLanguage` obligatorio
- validacion de consistencia

### Riesgo 3: degradar el catalogo actual

Mitigacion:

- no modificar el flujo `TEMPLATE`
- agregar ruta paralela `CUSTOM_I18N`

## Definition of done

1. el catalogo actual sigue funcionando sin cambios
2. `preferred_language` sigue siendo la fuente del idioma preferido del usuario
3. una notificacion custom multi idioma puede enviarse a un usuario, rol o segmento
4. el frontend resuelve idioma con fallback limpio
5. no se depende del header del request para decidir el idioma persistido
6. el endpoint admin sigue siendo uno solo por operacion y soporta ambos modos
7. existen tests de compatibilidad para `TEMPLATE` y `CUSTOM_I18N`
