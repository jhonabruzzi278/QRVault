# QRVault — Control de Inventario mediante Códigos QR (PWA)

Aplicación Web Progresiva (PWA) instalable en Android que escanea códigos QR de productos con la cámara del dispositivo, valida cada código contra una base de datos local (IndexedDB) y genera un reporte de escaneo (escaneados / encontrados / fuera de base de datos).

## Stack
- HTML5 + CSS3 + JavaScript vanilla (sin build step)
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) para el escaneo de cámara (vendorizado en `vendor/`)
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) para generar los QR del catálogo de prueba (vendorizado en `vendor/`)
- IndexedDB como base de datos local de inventario
- Web App Manifest + Service Worker para instalación y funcionamiento offline

## Cómo correrlo localmente
No requiere instalación de dependencias ni build. Sirve la carpeta como archivos estáticos, por ejemplo:

```bash
python -m http.server 8765
```

Luego abre `http://localhost:8765/index.html`. Para instalar como PWA o usar la cámara desde un celular, debe servirse por HTTPS (o accederse vía `localhost` en desarrollo).

## Uso
1. Abre `products.html` para ver e imprimir los 20 códigos QR de prueba (P001–P020). Los productos P016–P020 están marcados como "no registrado".
2. Abre `index.html` y presiona **Escanear Código QR**.
3. Apunta la cámara a los QR generados en `products.html` (puedes tener ambas pantallas abiertas, una en el celular escaneando la pantalla de otra pestaña/dispositivo).
4. Presiona **Finalizar y Ver Reporte** para ver el resumen.

## Estructura del proyecto
```
index.html        Pantalla de escaneo y reporte
products.html     Catálogo de prueba: genera los 20 QR
css/styles.css    Estilos
js/               Lógica: catálogo, IndexedDB, escaneo/reporte
vendor/           Librerías vendorizadas (html5-qrcode, qrcode-generator)
icons/            Íconos PWA
manifest.json     Web App Manifest
service-worker.js Cache offline-first
```

## 📋 Documentación del Proyecto (AI-DLC)

Este proyecto sigue la metodología AI-DLC. Estado actual: **Early Construction**

Documentación completa en [`/aidlc-docs/`](./aidlc-docs/):
- [Requirements](./aidlc-docs/requirements/)
- [Architecture](./aidlc-docs/design-artifacts/ARCHITECTURE.md)
- [Testing Strategy](./aidlc-docs/testing/TEST_STRATEGY.md)
- [Deployment (pendiente)](./aidlc-docs/deployment/)

Última auditoría: 2026-07-30
