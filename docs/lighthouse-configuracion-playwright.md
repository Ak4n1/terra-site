# Lighthouse en Configuracion (con Playwright autenticado)

## Objetivo
Medir Lighthouse sobre las 3 secciones de Configuracion del dashboard con sesion real iniciada:

- `/dashboard/configuration/profile`
- `/dashboard/configuration/activity`
- `/dashboard/configuration/security`

## Por que usar Playwright
Lighthouse solo no garantiza una sesion autenticada estable en este flujo.
Para evitar resultados de usuario anonimo, primero se autentica con Playwright y luego se ejecuta Lighthouse en la misma instancia de Chrome via CDP.

## Precondiciones
- Frontend corriendo en `http://localhost:4200`
- Backend/API corriendo en `http://localhost:8080`
- Credenciales de prueba validas

## Implementacion usada
Script: `.lighthouse/run-playwright-lh-all.cjs`

Resumen del flujo:
1. Lanza Chrome headless con `chrome-launcher`.
2. Conecta Playwright al Chrome lanzado (`connectOverCDP`).
3. Hace login via API desde el contexto de Playwright (`POST /api/auth/login`).
4. Navega a cada ruta de Configuracion con la sesion ya activa.
5. Corre Lighthouse con:
   - `onlyCategories = performance, accessibility, best-practices, seo`
   - `disableStorageReset = true`
   - `formFactor = desktop`
6. Guarda JSON por ruta en `.lighthouse/lh-playwright-auth-*.json`.
7. Genera resumen consolidado en `.lighthouse/configuration-summary-playwright-auth.json`.

## Comandos ejecutados
Instalacion temporal de dependencias (sin tocar `package.json`):

```powershell
npm install --no-save --no-package-lock lighthouse chrome-launcher
```

Ejecucion del test:

```powershell
node .lighthouse/run-playwright-lh-all.cjs
```

## Ultimos resultados (autenticado)
Fuente: `.lighthouse/configuration-summary-playwright-auth.json`

Ventana de ejecucion UTC:
- `profile`: `2026-04-01T01:21:57.081Z`
- `activity`: `2026-04-01T01:22:10.042Z`
- `security`: `2026-04-01T01:22:21.352Z`

| Seccion | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| profile | 43 | 98 | 100 | 91 | 2.3 s | 4.1 s | 530 ms | 0 | 2.4 s |
| activity | 59 | 98 | 100 | 91 | 2.3 s | 3.8 s | 210 ms | 0 | 2.5 s |
| security | 62 | 94 | 100 | 91 | 2.3 s | 3.8 s | 190 ms | 0 | 2.3 s |

## Hallazgos principales detectados
- Performance:
  - LCP alto en las 3 rutas (3.8 s - 4.1 s).
  - Main thread y JS pesado (sobre todo en `profile` con TBT 530 ms).
  - Recurso de render-blocking (`styles.css`).
  - `bf-cache` bloqueado por WebSocket.
- Accessibility:
  - `heading-order` en las 3 secciones.
  - En `security`, `label` en input oculto (`security-settings-page__sr-only`).
- SEO:
  - Falta `meta description`.

## Archivos generados
- `.lighthouse/lh-playwright-auth-profile.json`
- `.lighthouse/lh-playwright-auth-activity.json`
- `.lighthouse/lh-playwright-auth-security.json`
- `.lighthouse/configuration-summary-playwright-auth.json`
