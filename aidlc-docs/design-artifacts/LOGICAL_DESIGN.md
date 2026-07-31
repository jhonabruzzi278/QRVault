# Logical Design

## Patterns Detectados en el Código
- **Repository pattern** (ligero): `js/db.js` encapsula todo el acceso a IndexedDB detrás de `initInventoryDb()` / `lookupProduct()`; el resto de la app no toca IndexedDB directamente.
- **Static catalog + dynamic inventory split**: `FULL_CATALOG` (20, estático, en JS) se usa sólo para nombres/generación de QR; `REGISTERED_CODES`/IndexedDB (15) es la "base de datos" real contra la que se valida — separa "datos de referencia" de "datos de negocio verificables".
- **Vanilla event-driven UI**: sin framework; listeners DOM directos (`addEventListener`) + funciones puras de render (`renderScannedList`, `buildReport`).
- **Offline-first / cache-first service worker**: `service-worker.js` precachea el app shell y sirve cache-first para el mismo origen, dejando pasar sin interceptar los recursos de terceros (CDNs).

## Stack Tecnológico (detectado)

| Componente | Tecnología | Versión | Fuente |
|---|---|---|---|
| Escaneo QR | html5-qrcode | 2.3.8 | `vendor/html5-qrcode.min.js` (vendorizado desde unpkg) |
| Generación QR (catálogo de prueba) | qrcode-generator (Kazuhiko Arase) | 1.4.4 | `vendor/qrcode.min.js` (vendorizado desde jsDelivr) |
| Persistencia | IndexedDB (API nativa del navegador) | — | `js/db.js` |
| UI | HTML5 + CSS3 + JavaScript vanilla (sin build step) | — | raíz del proyecto |
| PWA | Web App Manifest + Service Worker | — | `manifest.json`, `service-worker.js` |
| Servidor de pruebas local | Python `http.server` | 3.11 | `.claude/launch.json` |

## Servicios Externos Detectados
Ninguno en runtime — la app no hace llamadas a APIs externas ni bases de datos remotas. Las únicas dependencias externas (html5-qrcode, qrcode-generator) fueron descargadas y vendorizadas en `/vendor/` para que la app funcione 100% offline/self-hosted, sin depender de disponibilidad de CDN.

## Decisión clave: por qué vendorizar en vez de CDN
Ver `ADR/ADR-001-vendored-dependencies.md`.
