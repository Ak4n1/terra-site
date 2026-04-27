# Auditoria Lighthouse - Terra Web

Fecha de corrida: `2026-04-17T00:42:57.775Z`

Ambiente auditado: `https://l2terra.online`

Modo: Desktop, Lighthouse `12.8.2`, Chrome headless con sesion admin autenticada.

Nota: el backend local `http://localhost:8080` no respondia durante la auditoria, asi que las rutas autenticadas se midieron contra produccion. Los JSON crudos quedaron en `.lighthouse/run-2026-04-17T00-42-57-775Z/` y el resumen en `.lighthouse/latest-summary.json`; esa carpeta esta ignorada por git.

## Rutas incluidas

Se midieron las rutas publicas, flujos de autenticacion y dashboard real. Se excluyeron:

- `/test` y `/test2`: rutas de desarrollo.
- `/dashboard/configuration`: redirige a `/dashboard/configuration/profile`.
- `**`: fallback que redirige a `/`.

## Resumen ejecutivo

- Rutas medidas: 19.
- Performance promedio: 93.
- Peor performance: `/recover-2fa` con 83.
- Accessibility promedio: 94.
- Best Practices promedio: 99.
- SEO promedio: 81.
- `npm run build` compila, pero avisa que el bundle inicial pesa `1.13 MB` raw y supera el budget de `900 kB` por `234.55 kB`.
- El build tambien marca `jquery` y `slick-carousel` como CommonJS, lo que causa optimization bailouts.

## Puntajes por ruta

| Ruta | Perf | A11y | Best | SEO | FCP | LCP | TBT | CLS | Speed Index | Req | Transfer |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 89 | 94 | 100 | 75 | 0.2 s | 1.1 s | 290 ms | 0.001 | 5.8 s | 53 | 1.07 MB |
| `/terms-of-service` | 91 | 95 | 100 | 75 | 0.8 s | 2.7 s | 190 ms | 0 | 4.1 s | 37 | 645 KB |
| `/privacy-policy` | 94 | 95 | 100 | 75 | 0.8 s | 2.3 s | 200 ms | 0 | 3.6 s | 37 | 432 KB |
| `/verify-email` | 98 | 100 | 100 | 82 | 0.8 s | 1.3 s | 150 ms | 0 | 1.5 s | 21 | 52 KB |
| `/reset-password` | 98 | 94 | 96 | 82 | 0.8 s | 1.3 s | 140 ms | 0 | 2.0 s | 27 | 109 KB |
| `/dashboard-reset-password` | 98 | 94 | 100 | 82 | 0.8 s | 1.3 s | 150 ms | 0 | 1.1 s | 27 | 13 KB |
| `/recover-2fa` | 83 | 90 | 100 | 75 | 0.8 s | 3.2 s | 400 ms | 0 | 2.5 s | 32 | 330 KB |
| `/dashboard` | 87 | 96 | 96 | 83 | 1.4 s | 3.5 s | 160 ms | 0 | 3.9 s | 39 | 434 KB |
| `/dashboard/game-accounts` | 86 | 92 | 100 | 83 | 1.2 s | 2.1 s | 270 ms | 0 | 7.9 s | 42 | 3.65 MB |
| `/dashboard/my-characters` | 93 | 96 | 100 | 83 | 1.0 s | 1.6 s | 310 ms | 0 | 1.7 s | 33 | 45 KB |
| `/dashboard/change-password` | 85 | 92 | 100 | 83 | 1.1 s | 3.8 s | 230 ms | 0.02 | 2.0 s | 44 | 415 KB |
| `/dashboard/offline-market` | 100 | 96 | 100 | 83 | 1.0 s | 1.5 s | 80 ms | 0 | 1.3 s | 31 | 14 KB |
| `/dashboard/buy-terra-coin` | 99 | 96 | 100 | 83 | 1.0 s | 1.5 s | 110 ms | 0 | 1.8 s | 31 | 13 KB |
| `/dashboard/send-terra-coin` | 100 | 96 | 100 | 83 | 0.9 s | 1.4 s | 60 ms | 0 | 1.5 s | 31 | 13 KB |
| `/dashboard/configuration/profile` | 88 | 94 | 100 | 83 | 1.6 s | 3.0 s | 290 ms | 0 | 2.9 s | 64 | 5.92 MB |
| `/dashboard/configuration/security` | 96 | 90 | 100 | 83 | 1.3 s | 2.2 s | 150 ms | 0 | 2.0 s | 43 | 57 KB |
| `/dashboard/configuration/activity` | 99 | 94 | 100 | 83 | 1.0 s | 1.9 s | 80 ms | 0 | 1.9 s | 43 | 28 KB |
| `/dashboard/configuration/notifications` | 93 | 94 | 100 | 83 | 1.2 s | 2.4 s | 250 ms | 0 | 2.1 s | 42 | 24 KB |
| `/dashboard/admin-notifications` | 94 | 96 | 96 | 83 | 1.8 s | 2.5 s | 170 ms | 0 | 2.0 s | 37 | 77 KB |

## Rutas mas pesadas

| Ruta | Transfer | Causa principal |
|---|---:|---|
| `/dashboard/configuration/profile` | 5.92 MB | 34 imagenes de avatar cargadas en el catalogo. |
| `/dashboard/game-accounts` | 3.65 MB | Carrusel con `goddar_4.3.png` (~2.6 MB) y `mithilmines.webp` (~985 KB). |
| `/` | 1.07 MB | Imagenes de footer/avatar y video decorativo `fire.mp4`. |
| `/terms-of-service` | 645 KB | Video decorativo y assets legales. |
| `/dashboard` | 434 KB | Imagenes y carga inicial de shell autenticado. |

## Hallazgos por prioridad

### P0 - Assets e imagenes

1. Optimizar el catalogo de avatares de perfil.

   En `/dashboard/configuration/profile`, Lighthouse detecta 64 requests y 5.92 MB transferidos; 5.86 MB son imagenes. Las mas grandes son `assets/images/app/avatars/Lineage/webp/FaceIcon_*.webp`, con valores entre ~280 KB y ~421 KB por avatar. El template carga todo el grupo activo desde `src/app/features/dashboard/pages/configuration/sections/profile/profile-settings.page.html`.

   Acciones:
   - Generar thumbnails reales de 96 o 128 px para el selector, separados de las imagenes grandes.
   - Agregar `loading="lazy"`, `decoding="async"`, `width` y `height` a los `<img>` del catalogo.
   - No renderizar todos los grupos a la vez; cargar solo la familia expandida y diferir el resto con `@defer` o una lista virtual.
   - Mantener la imagen grande solo para preview/crop, no para cada boton del selector.

2. Rehacer el carrusel de `/dashboard/game-accounts`.

   El componente usa backgrounds CSS en `src/app/shared/ui/organisms/sliders/single-item-carousel/single-item-carousel.component.ts`, por eso el navegador descarga imagenes grandes sin lazy loading. Ademas `src/app/features/dashboard/pages/game-accounts/game-accounts.page.ts` referencia `goddar_4.3.png` (~2.6 MB) y `mithilmines.webp` (~985 KB).

   Acciones:
   - Convertir `goddar_4.3.png` a WebP/AVIF y bajar dimensiones al tamano real visible del carrusel.
   - Cargar solo el slide activo; evitar `background-image` para assets pesados o moverlo a `<picture>/<img>`.
   - Reemplazar Slick/jQuery por un carrusel Angular/CSS scroll-snap. Esto mejora performance y tambien accessibility.

3. Revisar video decorativo `assets/videos/fire_2/fire.mp4`.

   Se usa en `home`, `terms` y `privacy`. El archivo local pesa ~5.9 MB. Aunque en la corrida entro por rangos parciales, sigue impactando red y cache.

   Acciones:
   - Usar `preload="metadata"` o `preload="none"` si no es contenido principal.
   - Agregar poster liviano.
   - Desactivar autoplay en `prefers-reduced-motion` y, si aplica, en `Save-Data`.
   - Considerar una version corta y comprimida WebM/MP4 para hero decorativo.

4. Optimizar footer y legales.

   `brand-footer.component.html` carga `adults_r8.png` (~278 KB transferidos en home) y logos. Convertir a WebP/AVIF, ajustar dimensiones y validar que todos tengan `width`/`height`.

### P0 - Cache y servidor

Lighthouse marco `cache-insight` y `uses-long-cache-ttl` en las 19 rutas. El `Dockerfile.beta` usa `.docker/nginx.conf`, que hoy solo hace `try_files` y no define cache ni compresion para assets. La configuracion productiva temporal `.tmp/l2terra.nginx.conf` tambien proxy-pasa el frontend sin reglas visibles de cache para assets.

Acciones:

- Para bundles hasheados de Angular (`main-*.js`, `chunk-*.js`, `styles-*.css`) usar:

```nginx
location ~* \.(?:js|css|woff2|webp|avif|png|jpg|jpeg|svg|ico)$ {
  expires 1y;
  add_header Cache-Control "public, max-age=31536000, immutable";
  try_files $uri =404;
}
```

- Para `index.html` usar no-cache:

```nginx
location = /index.html {
  add_header Cache-Control "no-cache";
}
```

- Habilitar gzip para texto si no hay Brotli:

```nginx
gzip on;
gzip_types text/css application/javascript application/json image/svg+xml;
gzip_min_length 1024;
```

### P1 - JavaScript inicial

El build productivo compila pero supera el budget inicial: `1.13 MB` raw. El mayor chunk inicial pesa `608.31 kB`. Tambien hay warnings de CommonJS por `jquery` y `slick-carousel`.

Acciones:

- Sacar Firebase Auth del camino inicial. `AuthFacadeService` inyecta `FirebaseAuthService`, que importa `firebase/app` y `firebase/auth`. Cargar Firebase con `import()` solo al click de "Continuar con Google".
- Diferir `AuthOverlayContainerComponent` hasta que el usuario abre login/register. Hoy `app.html` lo monta siempre.
- Eliminar Slick/jQuery de `SingleItemCarouselComponent` y `SpotlightCarouselV2Component`; usar Angular + CSS transform/scroll-snap.
- En perfil, diferir `ngx-image-cropper` y `browser-image-compression` hasta que el usuario selecciona un archivo. Ahora viven en el lazy chunk de profile, pero no hace falta cargarlos al entrar a la pagina.

### P1 - SEO

SEO queda entre 75 y 83. Fallas repetidas:

- `meta-description` en las 19 rutas.
- `robots-txt` en las 19 rutas.
- `crawlable-anchors` en rutas con links `href="#"`.

Acciones:

- Agregar descripcion base en `src/index.html` y/o servicio route-aware con `Title` y `Meta`.
- Agregar `public/robots.txt` y `public/sitemap.xml`.
- Usar rutas reales o botones para acciones internas; evitar anchors con `href="#"` cuando no navegan.
- Considerar `noindex` para dashboard autenticado si no debe indexarse.
- Sincronizar `html lang`; hoy `src/index.html` queda en `en` aunque la UI puede estar en `es`.

### P1 - Accessibility

Fallas mas repetidas:

- `label-content-name-mismatch`: el selector de idioma muestra `ESP`, pero su `aria-label` es solo `Idioma`.
- `aria-hidden-focus`: el menu mobile cerrado mantiene links/botones focusables dentro de `aria-hidden="true"`.
- En rutas con Slick, los slides clonados quedan `aria-hidden="true"` pero contienen botones focusables.
- `aria-command-name`: en dashboard topbar hay un elemento con `role="link"` y `tabindex="0"` sin nombre accesible.
- `heading-order`: algunos componentes saltan niveles de heading.

Acciones:

- En `LanguageFlagTriggerComponent`, incluir el texto visible en el nombre accesible, por ejemplo `Idioma: ESP`.
- En el menu mobile, usar `inert` cuando esta cerrado o quitarlo del DOM con `*ngIf`.
- Si se conserva Slick, desactivar tabindex de contenido dentro de slides clonados/ocultos. Mejor: reemplazar Slick.
- Agregar `aria-label` al link/icono del topbar.
- Revisar jerarquia de headings en hero/carousels y en paginas de configuracion.

### P2 - Best Practices y mantenimiento

- `valid-source-maps` falla en todas las rutas; revisar si los source maps de produccion estan referenciados pero no servidos, o si conviene desactivarlos completamente en prod.
- `bf-cache` falla en todas las rutas, probablemente por WebSocket/realtime global. Evitar conectar realtime en paginas donde no se necesita o pausar/cerrar la conexion en `pagehide`.
- El dashboard arranca `RealtimeService` y `NotificationsStore` desde `App`; conviene inicializarlos solo si hay sesion y solo en superficies que lo requieren.

## Orden sugerido de trabajo

1. Comprimir y redimensionar imagenes pesadas: avatars, `goddar_4.3.png`, footer y assets legales.
2. Agregar cache headers y gzip/Brotli en Nginx.
3. Reemplazar Slick/jQuery por carousel propio.
4. Diferir Firebase/Auth overlay/cropper.
5. Agregar meta descriptions, robots y sitemap.
6. Corregir accessibility del selector de idioma, menu mobile y slides ocultos.
7. Repetir Lighthouse en desktop y luego mobile sobre las mismas rutas.

## Comandos usados

```powershell
npm run build
npm install --no-save --no-package-lock lighthouse chrome-launcher
$env:LH_EMAIL='<cuenta-admin>'
$env:LH_PASSWORD='<password-admin>'
node .lighthouse\run-authenticated-audit.cjs
```

El runner queda en `.lighthouse/run-authenticated-audit.cjs` y esta ignorado por git. No se versionan credenciales ni artefactos crudos.
