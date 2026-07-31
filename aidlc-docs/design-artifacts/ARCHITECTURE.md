# Architecture Overview

## Estructura del Proyecto

```
QRVault/
├── index.html              # Pantalla principal: home → escaneo → reporte (SPA de 1 archivo, sin router)
├── products.html           # Catálogo de prueba: genera y muestra los 20 QR (imprimible)
├── manifest.json           # Web App Manifest (PWA instalable)
├── service-worker.js        # Cache-first para el shell de la app, offline-first
├── css/
│   └── styles.css          # Estilos únicos de toda la app (tema oscuro)
├── js/
│   ├── products-data.js    # FULL_CATALOG (20 productos) + REGISTERED_CODES (15)
│   ├── db.js               # Repository IndexedDB (init, seed, lookup)
│   └── app.js              # Lógica de UI: escaneo, dedupe, render, reporte
├── vendor/
│   ├── html5-qrcode.min.js # Librería de escaneo QR (vendorizada)
│   └── qrcode.min.js       # Librería de generación QR (vendorizada, para products.html)
├── icons/
│   ├── icon.svg / icon-192.png / icon-512.png  # Iconos PWA (generados con Pillow)
└── aidlc-docs/              # Esta documentación
```

## Tech Stack

| Layer | Tech | Justificación | Fuente |
|---|---|---|---|
| Presentación | HTML/CSS/JS vanilla | Requisito explícito del brief; sin necesidad de framework para este alcance | brief del usuario |
| Escaneo cámara | html5-qrcode | Librería pedida explícitamente en el brief | brief del usuario |
| Persistencia | IndexedDB | Elegida entre las 2 alternativas mencionadas en el brief (IndexedDB vs JSON) por ser más fiel a "app offline instalable" | decisión de esta sesión, documentada en ADR-001 |
| Offline | Service Worker + Manifest | Requisito PWA explícito | brief del usuario |

## Decisiones Arquitectónicas Detectadas
- **Monolito cliente-only**: no hay backend; toda la lógica de negocio (comparación contra "base de datos") corre en el navegador. Correcto para el alcance de demo — no hay requisito de sincronización multi-dispositivo o auditoría centralizada.
- **Datos estáticos embebidos en JS** en vez de fetch a un archivo `.json`: simplifica el offline-first (no hay que gestionar cacheo adicional de un fetch) a costa de que actualizar el catálogo requiere editar código. Aceptable para 20 productos ficticios fijos.
- **Sin bundler/build step**: todo se sirve como archivos estáticos directos. Reduce complejidad operativa pero implica que cualquier librería adicional debe vendorizarse manualmente (ver ADR-001).
