# Test Strategy

## Framework Detectado
Ninguno instalado todavía (no hay `package.json` ni test runner). ⚠️ Gap real — no un dato pendiente de extraer, sino algo que genuinamente falta.

## Verificación realizada en esta sesión (manual, no automatizada)
En ausencia de un framework de tests, se verificó el comportamiento real de la app ejecutando sus funciones (`handleDecodedCode`, `buildReport`, `resetSession`) directamente en el navegador contra los 3 casos de prueba oficiales del brief (ver `story-artifacts/ACCEPTANCE_CRITERIA.md`). Los tres pasaron.

## Coverage Actual
No se pudo medir — no hay comando de test configurado. Ejecutar manualmente si se agrega un test runner (sugerido: Vitest + `fake-indexeddb` para simular IndexedDB en Node, o Playwright para e2e real con cámara simulada vía `getUserMedia` mockeado).

## Gaps Identificados
- Sin tests unitarios para `js/db.js` (lookup, seed) ni `js/app.js` (dedupe, reporte).
- Sin test E2E real con Playwright que abra la cámara simulada y escanee un QR generado en pantalla.
- Sin prueba en dispositivo Android físico (cámara real, instalación PWA real, comportamiento offline real tras "Add to Home Screen").

## Recomendación (roadmap)
1. Agregar Vitest + `fake-indexeddb` para cubrir `js/db.js` y la lógica de `js/app.js` sin necesitar navegador.
2. Agregar un test Playwright que cargue `products.html`, capture el `data`/texto de un QR generado, y lo inyecte como resultado simulado de `Html5Qrcode` en `index.html`, verificando los 3 casos de aceptación de forma automatizada.
3. Prueba manual en un dispositivo Android real antes de considerar el flujo cerrado.
