# Plan de Implementación y Mejora: Offline Market (Web + API)

## 1) Objetivo
Implementar la sección **Offline Market** en la stack actual:
- Frontend actual: `C:\Users\JeeP_\OneDrive\Escritorio\Terra-web-v2`
- API actual: `C:\Users\JeeP_\OneDrive\Escritorio\terra-api-v2\terra-api`

Tomando como referencia funcional lo que ya existe en:
- Frontend viejo: `C:\Users\JeeP_\OneDrive\Escritorio\Terra-web\terra-web`
- API vieja: `C:\Users\JeeP_\OneDrive\Escritorio\terra-api-v2\api-terra`

Con foco en:
- Migración ordenada sin regresiones
- Mejoras de arquitectura/patrones
- Escalabilidad (consultas y memoria)
- Logging limpio y resumido en carga de XML

## Restricción crítica (NO negociable)
- **No crear entidades JPA para tablas del juego** (Lineage 2), para evitar modificaciones no deseadas del esquema.
- El acceso a tablas de juego debe ser **read-only** y mediante **JDBC/DTO** (patrón similar a `GameAccountsJdbcRepository` en `terra-api`).
- Referencia de esquema de juego validada en:
  - `D:\\Terra\\build\\db_installer\\sql\\game`
  - `D:\\Terra\\build\\db_installer\\sql\\login`
  - tablas relevantes: `character_offline_trade`, `character_offline_trade_items`, `characters`, `items`, `accounts`.

---

## 2) Estado Actual Relevado

### Frontend viejo (referencia funcional)
- Página/componente implementado en:
  - `terra-web/src/app/components/dashboard/game/offline-market/offline-market.component.ts`
  - `terra-web/src/app/components/dashboard/game/offline-market/offline-market.component.html`
  - `terra-web/src/app/services/offline-market.service.ts`
- Usa endpoint:
  - `GET /api/game/offline-market/paginated`
- Soporta:
  - filtros (`searchTerm`, `sortBy`, `storeType`)
  - paginación
  - tipos de tienda (Sell/Buy/Pack)
  - metadatos de ítem (icon, grade, enchant, etc.)

### Frontend actual (v2)
- Ruta ya registrada en dashboard:
  - `Terra-web-v2/src/app/features/dashboard/pages/offline-market`
- Actualmente está placeholder (`section` vacío).

### API vieja (referencia funcional)
- Endpoints en:
  - `api-terra/.../game/controllers/OfflineMarketController.java`
- Servicio en:
  - `api-terra/.../game/services/OfflineMarketServiceImpl.java`
- Carga catálogos XML en memoria:
  - `ItemTable` (`l2j.items.path: classpath:static/items`)
  - `MapRegionTable` (`l2j.mapregion.path: classpath:static/mapregion`)
- Build de `api-terra` ya está preparado para copiar recursos estáticos al classpath.
  - Verificado en `target/classes/static/items` y `target/classes/static/mapregion`.

### API actual (`terra-api`)
- Tiene arquitectura por módulos (api/application/domain/infrastructure), más escalable.
- Hoy no existe módulo de `offline-market` todavía.
- Ya contiene recursos `static/items` y `static/mapregion` en:
  - `terra-api/src/main/resources/static/items`
  - `terra-api/src/main/resources/static/mapregion`

---

## 3) Plan Frontend (Terra-web-v2)

## Fase 1: Contratos y modelo de datos
Crear tipados dedicados en v2:
- `src/app/features/dashboard/pages/offline-market/models/offline-market.model.ts`
  - `OfflineStore`
  - `OfflineStoreItem`
  - `PaginatedOfflineMarketResponse`
  - `OfflineMarketFilters`

Beneficio:
- Contrato estable y mantenible para UI + servicios.

## Fase 2: Servicio HTTP v2
Crear servicio en:
- `src/app/features/dashboard/services/offline-market.service.ts`

Lineamientos:
- Usar `environment.apiBaseUrl` (estándar v2)
- Soportar paginación/filtros
- Timeout, manejo de errores normalizado
- Evitar endpoint legacy sin paginación salvo uso administrativo

## Fase 3: Implementación de la página Offline Market
Completar:
- `src/app/features/dashboard/pages/offline-market/offline-market.page.ts`
- `src/app/features/dashboard/pages/offline-market/offline-market.page.html`
- `src/app/features/dashboard/pages/offline-market/offline-market.page.css`

Recomendación UX:
- Mantener estructura del dashboard v2 (tokens y estilos existentes)
- Estados explícitos: loading, error, empty, data
- Paginación responsiva
- `trackBy` en listas
- Búsqueda con debounce (200-300ms)

## Fase 4: i18n (v2)
Agregar módulo de traducciones dedicado:
- `src/app/core/i18n/modules/dashboard-offline-market.translations.ts`

Claves sugeridas:
- título/subtítulo
- labels de filtros
- estados de carga/error/vacío
- tipos de tienda
- paginación

## Fase 5: Integración de íconos de items

### Ruta destino recomendada en web actual
- `C:\Users\JeeP_\OneDrive\Escritorio\Terra-web-v2\public\assets\icons\icons_items`

### Ruta origen (web vieja)
- `C:\Users\JeeP_\OneDrive\Escritorio\Terra-web\terra-web\public\assets\icons\icons_items`

Notas:
- La web vieja tiene ~`12273` íconos en `icons_items`.
- Mantener convención de nombre exacta (`nombre_icono.png`).
- Definir fallback único para faltantes (ejemplo recomendado):
  - `public/assets/icons/icons_items/_fallback.png`

### Bind recomendado en template
- `src="/assets/icons/icons_items/${iconName}.png"`
- `onerror -> /assets/icons/icons_items/_fallback.png`

## Fase 6: QA frontend
Checklist:
- filtros combinados (search + type + sort)
- paginación en móvil/desktop
- render de íconos existentes y fallback
- no romper layout dashboard
- prueba con data grande (múltiples páginas)

---

## 4) Plan Backend (terra-api) con mejoras de diseño

## Objetivo backend
Migrar funcionalidad de `api-terra` a `terra-api` con arquitectura modular/limpia, evitando lógica monolítica en un solo service.
Sin mapear tablas del juego con `@Entity`.

## Estructura sugerida en API actual
Crear módulo:
- `com.terra.api.game.offline_market`

Capas:
- `api/controller`
- `api/dto`
- `application`
- `domain/model`
- `domain/port`
- `infrastructure/persistence`
- `infrastructure/catalog` (adaptador a catálogos en memoria)

Regla de persistencia para este módulo:
- `infrastructure/persistence/jdbc` para consultas al schema de juego.
- `domain/port` + `jdbc repository` para desacoplar.
- DTOs/proyecciones, sin `JpaRepository` contra tablas de juego.

## Endpoints sugeridos
- `GET /api/game/offline-market` (opcional legacy, deprecado)
- `GET /api/game/offline-market/paginated` (principal)

Mejora recomendada:
- Envolver respuesta con `ApiResponse<T>` (estándar actual `terra-api`).

## Mejora crítica de escalabilidad
En `api-terra` hoy se hace:
1. cargar todas las tiendas
2. filtrar en memoria
3. paginar en memoria

Esto no escala bien.

Migrar a:
- paginación y filtros en query SQL JDBC dedicada (`LIMIT/OFFSET` + filtros parametrizados)
- resolver metadatos de ítems en batch (no N+1)
- resolver character/city en batch (no N+1)

Importante por restricción de tablas de juego:
- para `offline-market`, usar **query SQL paginada con `LIMIT/OFFSET`** vía JDBC.
- evitar `Specification/JPA Entity` sobre tablas L2.

Resultado:
- menor latencia
- menor uso de heap
- mejor throughput

---

## 5) Catálogos XML (items/mapregion) y carga en memoria

## Recomendación de diseño
Crear servicio reutilizable de catálogo en `terra-api`:
- `game/shared/infrastructure/catalog`

Componentes sugeridos:
- `ItemCatalogLoader`
- `MapRegionLoader`
- `CatalogLoadReport` (métricas de carga)

## Propiedades de configuración sugeridas
- `l2j.items.path=classpath:static/items`
- `l2j.mapregion.path=classpath:static/mapregion`

Con fallback compatible para ejecución en JAR:
- `resource.getFile()` (dev)
- `resource.getInputStream()` (prod/jar)

---

## 6) Logging solicitado (resumen, no spam)

## Problema actual
En la API vieja hay logs por ítem en algunos casos (`warn` repetitivos), lo que ensucia startup/logs productivos.

## Comportamiento objetivo
Al iniciar API, log compacto por carga de catálogo. Ejemplo:

```text
[CATALOG][ITEMS] Files=228 Loaded=12332 Skipped=23 DurationMs=1840
[CATALOG][ITEMS] SampleSkippedIds=102, 9987, 12003, 45001, 77002
[CATALOG][MAPREGION] Files=27 Loaded=198 DurationMs=96
```

## Política recomendada
- `INFO`: solo resumen final por catálogo
- `WARN`: solo resumen de fallas (no por cada item)
- `DEBUG`: detalle por archivo/item (solo para troubleshooting)

## Contadores mínimos en reporte
- `filesProcessed`
- `itemsLoaded`
- `itemsSkipped`
- `duplicates`
- `parseErrors`
- `durationMs`

---

## 7) Validación de Build y Recursos

Para `api-terra` (vieja):
- Verificado que recursos estáticos llegan a `target/classes/static/*`.

Para `terra-api` (actual):
- Confirmar en pipeline que `src/main/resources/static/items` y `mapregion` se empaquetan.
- Agregar test de smoke que valide:
  - se encuentran recursos por patrón classpath
  - se cargan N>0 ítems y N>0 regiones
- Agregar test de arquitectura que falle si aparecen `@Entity` nuevas bajo módulo `game/offline_market`.
- Forzar que consultas de juego se ejecuten en modo lectura (`Connection.setReadOnly(true)` o datasource read-only).

## Configuración recomendada para evitar romper tablas del juego
- No usar `spring.jpa.hibernate.ddl-auto=create-drop` en entornos que apunten a DB de juego.
- Separar datasource:
  - datasource app (entidades propias de la API)
  - datasource game read-only (JDBC para L2 tables)
- Si no se separa datasource en primera etapa:
  - mínimo dejar `ddl-auto=validate`/`none` en entorno compartido con DB de juego.
  - bloquear permisos DDL del usuario DB usado por la API sobre schema de juego.

---

## 8) Plan de Ejecución por Sprint

## Sprint 1 (Frontend base + contrato API)
- crear modelos + servicio v2
- implementar UI Offline Market con filtros/paginación/estados
- conectar endpoint paginado
- i18n base

## Sprint 2 (Backend módulo offline_market en terra-api)
- crear módulo completo con arquitectura actual
- endpoint paginado con filtros en DB
- integración con catálogo items/mapregion en memoria

## Sprint 3 (Hardening + performance)
- logging resumido de carga
- métricas de startup
- tests unitarios/integración
- QA de datos grandes y revisión de tiempos

---

## 9) Riesgos y Mitigación

- Riesgo: N+1 queries en armado de tiendas
  - Mitigación: batch fetch + joins/proyecciones.

- Riesgo: íconos faltantes o nombres inconsistentes
  - Mitigación: fallback único + script de verificación de archivos faltantes.

- Riesgo: diferencias de contrato entre api vieja y nueva
  - Mitigación: DTO adapter temporal + feature flag en frontend.

- Riesgo: sobrecarga de logs en prod
  - Mitigación: política INFO/WARN/DEBUG y resumen agregado.

- Riesgo: alterar tablas del juego accidentalmente (DDL/JPA)
  - Mitigación: cero entidades sobre schema de juego + JDBC read-only + usuario DB sin permisos DDL.

---

## 10) Entregables

- Página `offline-market` implementada en `Terra-web-v2`.
- Módulo backend `offline_market` implementado en `terra-api`.
- Catálogo XML cargado en memoria con log resumen (ej: `12332 cargados, 23 no cargados`).
- Íconos disponibles en ruta nueva y fallback estandarizado.
- Checklist QA funcional y de performance completado.

---

## 11) Rate Limiter, Cache y Search (criterio operativo)

## Rate limiter para offline market (sin bloquear UX)
- Aplicar política específica para `GET /api/game/offline-market/paginated` (no reutilizar la de auth/game-accounts).
- Política recomendada inicial:
  - burst alto: `60 req/min` por usuario autenticado
  - refill suave para navegación y filtros
  - respuesta con `429` + `Retry-After` solo en abuso real.
- No aplicar límites agresivos por IP para este endpoint (evita falsos positivos en redes compartidas).

## Cache (patrón e-commerce)
- Cachear respuesta paginada por clave de consulta:
  - `userId + page + size + sortBy + storeType + searchTermNormalizado`
- TTL corto recomendado: `10-30s` (catálogo “casi en vivo”).
- Invalidación:
  - por TTL
  - o explícita cuando haya eventos de cambio relevantes.
- Opcional nivel 2:
  - cache de metadatos de item (`itemId -> name/icon/grade`) por TTL mayor.

## Front para no disparar requests innecesarios
- `debounceTime(300-500ms)` en search.
- `distinctUntilChanged()`.
- cancelación de request anterior (`switchMap`) al tipear.
- mínimo de caracteres para búsqueda libre (`>= 2`) si se desea reducir ruido.

## Search term y operador LIKE
- Sí, la búsqueda debe implementarse como equivalente a `%like%`:
  - `LOWER(columna) LIKE CONCAT('%', LOWER(:searchTerm), '%')`
- Siempre parametrizado (sin concatenar SQL manual) para evitar inyección.
- Aplicar a:
  - nombre personaje
  - título de tienda
  - nombre de ítem.
