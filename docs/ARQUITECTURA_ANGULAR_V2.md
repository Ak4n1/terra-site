# Arquitectura Angular V2 (Solo Frontend)

## Objetivo
Rediseñar la arquitectura del frontend Angular desde cero, manteniendo **las mismas funcionalidades** actuales, pero con:

1. Mejor organización por dominios.
2. Componentes reutilizables con enfoque **Atomic Design**.
3. Eliminación de CSS duplicado.
4. Base sólida para escalar sin deuda técnica.

Este documento define **estructura, reglas y convenciones**.  
No cambia endpoints ni lógica de negocio de la API.

---

## Principios

1. **Mismas features, nueva estructura**: no se elimina funcionalidad.
2. **Feature-first**: la app se organiza por dominio funcional.
3. **Design System primero**: estilos comunes centralizados.
4. **Atomic Design en `shared/ui`**: atoms, molecules, organisms.
5. **Separación de responsabilidades**: `core`, `shared`, `features`.
6. **Reutilización obligatoria**: si se repite 2 veces, se extrae.

---

## Estructura de carpetas propuesta
wwwwwwwwwwwwwwwwwwwwwwwwwww```text
src/
  app/
    core/
      config/
      constants/
      guards/
      interceptors/
      layout/
      services/
      types/

    shared/
      ui/
        atoms/
        molecules/
        organisms/
      directives/
      pipes/
      utils/
      models/

    features/
      public/
        pages/
        components/
        services/
        models/
        routes.ts
      auth/
        pages/
        components/
        services/
        models/
        routes.ts
      dashboard/
        pages/
        components/
        services/
        models/
        routes.ts
      payment/
        pages/
        components/
        services/
        models/
        routes.ts

    app.routes.ts
    app.config.ts

  styles/
    tokens.css
    themes.css
    utilities.css
    reset.css
    globals.css
```

---

## Responsabilidad por capa

## `core/`
Infraestructura transversal:

1. Interceptors HTTP.
2. Guards de auth.
3. Configuración global.
4. Layout principal (shell dashboard, wrappers).
5. Servicios base compartidos (ej: session/token state).

No contiene UI de negocio.

## `shared/`
Reutilizable entre features:

1. Sistema UI atómico (`ui/`).
2. Pipes/directives genéricas.
3. Utilidades puras.
4. Modelos realmente compartidos.

No debe depender de `features/`.

## `features/`
Cada dominio encapsulado:

1. `pages/`: vistas enrutables.
2. `components/`: componentes internos del feature.
3. `services/`: acceso a backend del dominio.
4. `models/`: tipos del dominio.
5. `routes.ts`: rutas lazy del feature.

---

## Atomic Design aplicado

## Atoms
Unidades mínimas UI:

1. `ui-button`
2. `ui-input`
3. `ui-badge`
4. `ui-icon`
5. `ui-spinner`
6. `ui-text`

## Molecules
Combinaciones pequeñas:

1. `ui-form-field`
2. `ui-search-box`
3. `ui-card-header`
4. `ui-stat-item`
5. `ui-notification-item`

## Organisms
Bloques complejos reutilizables:

1. `ui-navbar`
2. `ui-sidebar`
3. `ui-auth-form`
4. `ui-notifications-dropdown`
5. `ui-streamer-list`
6. `ui-dashboard-widget`

Regla: `features/*/components` prioriza componer con `shared/ui/*`.

---

## Estrategia de estilos (anti-duplicación CSS)

## Archivos globales

1. `tokens.css`: colores, spacing, radios, sombras, tipografía, z-index.
2. `themes.css`: tema base y variaciones.
3. `utilities.css`: utilidades globales (`.u-flex`, `.u-gap-sm`, etc.).
4. `reset.css`: normalización base.
5. `globals.css`: estilos globales mínimos.

## Reglas

1. Prohibido redefinir colores hardcodeados en cada componente.
2. Prohibido repetir clases de botón/card/form en features.
3. Todo patrón visual repetido va a `shared/ui` o `styles/utilities.css`.
4. Cada componente debe usar tokens (`var(--color-*)`, `var(--space-*)`).

---

## Routing

## Nivel app
`app.routes.ts` solo enruta a features lazy:

1. `public`
2. `auth`
3. `dashboard`
4. `payment`
5. `not-found`

## Nivel feature
Cada feature define su `routes.ts` local para mantener encapsulación.

---

## Convenciones de naming

1. Componente UI compartido: `ui-<nombre>` (ej: `ui-button`).
2. Página de feature: `<feature>-<name>.page.ts`.
3. Componente interno feature: `<feature>-<name>.component.ts`.
4. Servicio de feature: `<feature>-api.service.ts` o `<feature>.service.ts`.
5. Modelos: `<entity>.model.ts`.

---

## Mapa funcionalidad actual -> nueva arquitectura

## Public
Home, about, gallery, information, streamers, download, footer, widgets:
`features/public/*`

## Auth
Login, register, forgot/reset password, verify/resend email, ajustes:
`features/auth/*`

## Dashboard
Home dashboard, game account tools, market, support, notifications:
`features/dashboard/*`

## Payment
Success, pending, failure:
`features/payment/*`

## Transversal
Auth guard, auth interceptor, preload global, config endpoint:
`core/*`

---

## Reglas de dependencia

1. `features/*` puede usar `shared/*` y `core/*`.
2. `shared/*` no puede importar `features/*`.
3. Un feature no debe importar componentes internos de otro feature.
4. Comunicación entre features solo vía `core services` o estado compartido explícito.

---

## Plan recomendado de implementación (para codificar)

1. Crear estructura base (`core`, `shared`, `features`, `styles`).
2. Definir tokens + utilidades globales.
3. Implementar atoms base (`button`, `input`, `card`, `badge`, `spinner`).
4. Montar routing lazy por feature.
5. Migrar feature por feature manteniendo endpoints y comportamiento.
6. Eliminar CSS duplicado a medida que migra cada pantalla.

---

## Checklist de calidad

1. Todas las rutas actuales existen en la nueva app.
2. Todos los flujos funcionales se conservan (auth, dashboard, pagos, etc.).
3. Sin CSS duplicado evidente entre features.
4. Componentes comunes movidos a `shared/ui`.
5. `core` libre de UI de negocio.
6. Carga lazy por feature activa.

---

## Nota final
Este rediseño es **arquitectónico**, no funcional:  
la experiencia del usuario y las capacidades actuales se mantienen, pero con una base limpia, mantenible y escalable.
