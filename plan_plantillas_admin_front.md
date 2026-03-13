# plan_plantillas_admin_front.md

## Objetivo

Diseñar e implementar la primera capa frontend del modulo administrativo de notificaciones sin introducir todavia persistencia de plantillas en backend.

La pantalla debe quedar preparada para tres capacidades:

1. crear plantillas
2. enviar notificaciones
3. auditar envios

## Decisiones de producto

### Quien crea plantillas

Solo `SUPER_ADMIN`.

Motivo:

- crear plantillas impacta el catalogo operativo
- afecta multi idioma, contratos y consistencia del sistema
- no debe quedar abierto a administradores operativos comunes

### Quien puede enviar notificaciones

- `ADMIN`
- `SUPER_ADMIN`

Motivo:

- es una operacion administrativa legitima
- no modifica el catalogo base
- reutiliza plantillas ya aprobadas

### Quien puede ver auditoria

- `ADMIN`
- `SUPER_ADMIN`

Motivo:

- ambos perfiles necesitan trazabilidad operativa
- la auditoria debe ser de solo lectura

## Alcance de esta fase

Solo frontend.

No se implementa todavia:

- creacion real de plantillas en backend
- persistencia de drafts
- endpoints de auditoria

## Navegacion interna del modulo

La pagina `Admin notifications` debe tener una mini navegacion con tres tabs:

1. `Create templates`
2. `Send notifications`
3. `Audit`

### Reglas de acceso visual

#### `Create templates`

- visible para `SUPER_ADMIN`
- oculta o bloqueada para `ADMIN`

#### `Send notifications`

- visible para `ADMIN`
- visible para `SUPER_ADMIN`

#### `Audit`

- visible para `ADMIN`
- visible para `SUPER_ADMIN`

## Lineamientos de UI

La pantalla debe reutilizar el lenguaje visual ya presente en dashboard, especialmente el patron de formularios de `Create account`.

### Reutilizacion obligatoria

- `ui-button`
- `ui-field-label`
- `ui-input-control`
- nuevo `ui-select-control`
- idealmente un `ui-select-field` para que el uso en pantallas quede consistente con `ui-input-field`

### Nuevo atomo requerido

Crear un atomo:

- `ui-select-control`

Debe verse muy cercano a `ui-input-control`:

- mismo fondo
- mismo borde
- mismo padding
- mismo comportamiento de foco
- mismo font-family

### Molecula recomendada

Crear una molecula:

- `ui-select-field`

Debe replicar la semantica de `ui-input-field`:

- label arriba
- control abajo
- misma separacion visual

## Seccion Create templates

Esta fase debe construir el frontend de creacion de plantillas como formulario realista, aunque sin guardar en backend todavia.

Campos recomendados:

- template code
- category
- severity
- title key
- body key
- param keys
- allowed targets
- preview de idiomas

### Comportamiento esperado

- validacion local minima
- preview local
- boton principal deshabilitado o marcado como `coming soon` hasta que exista backend

## Seccion Send notifications

Debe reutilizar el flujo ya existente y mejorarlo visualmente.

Modos:

1. individual
2. broadcast

Debe usar:

- `ui-input-field`
- `ui-select-field`
- `ui-button`

## Seccion Audit

En esta fase debe existir solo como frontend scaffold:

- filtros visuales
- tabla o lista de eventos
- estado vacio o registros mockeados

No debe fingir persistencia real.

## Datos mock de frontend permitidos en esta fase

### Create templates

Permitido:

- draft local en memoria
- preview local

### Audit

Permitido:

- lista mock tipada
- mensajes de estado vacio

## Orden de implementacion

1. crear `ui-select-control`
2. crear `ui-select-field`
3. rediseñar `admin-notifications.page` con tabs internos
4. mover la seccion actual de envio al tab `Send notifications`
5. agregar tab `Create templates`
6. agregar tab `Audit`
7. traducir nuevos textos

## Definition of done

1. existe mini navegacion interna con tres tabs
2. `Create templates` solo aparece para `SUPER_ADMIN`
3. `Send notifications` aparece para `ADMIN` y `SUPER_ADMIN`
4. `Audit` aparece para `ADMIN` y `SUPER_ADMIN`
5. la pagina reutiliza componentes atomicos y moleculares del sistema
6. existe un `ui-select-control` consistente con los inputs actuales
7. la pagina compila y mantiene el estilo del dashboard
