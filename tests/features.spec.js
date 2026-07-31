const { test, expect } = require('@playwright/test');

test('entrada manual de código agrega un producto escaneado', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForTimeout(500);

  await page.evaluate(() => switchScreen(document.getElementById('scan-screen')));
  await page.fill('#manual-code-input', 'p001');
  await page.click('#manual-code-btn');

  await expect(page.locator('#scanned-count')).toHaveText('1');
  await expect(page.locator('.scanned-item__code')).toHaveText('P001');
  await expect(page.locator('#manual-code-input')).toHaveValue('');
});

test('el toggle de tema cambia data-theme y persiste en localStorage', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForTimeout(500);

  const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(initialTheme).toBe('dark');

  await page.click('#theme-toggle-btn');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  const stored = await page.evaluate(() => localStorage.getItem('qrvault-theme'));
  expect(stored).toBe('light');

  await page.reload();
  await page.waitForTimeout(300);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('finalizar escaneo guarda una sesión y aparece en el historial', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForTimeout(500);

  await page.evaluate(async () => {
    for (const p of FULL_CATALOG) await handleDecodedCode(p.code);
    buildReport();
    await finishScanning();
  });

  await page.click('#reset-btn');
  await page.click('#nav-history-btn');
  await expect(page.locator('.history-item')).toHaveCount(1);
  await expect(page.locator('.history-item__stats')).toContainText('20 escaneados');
  await expect(page.locator('.history-item__stats')).toContainText('15 encontrados');
  await expect(page.locator('.history-item__missing')).toContainText('P016');
});

test('exportar CSV genera un archivo con los productos escaneados', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForTimeout(500);

  const csv = await page.evaluate(async () => {
    await handleDecodedCode('P001');
    await handleDecodedCode('P999');
    buildReport();

    let capturedBlob = null;
    const origCreate = URL.createObjectURL;
    URL.createObjectURL = (blob) => {
      capturedBlob = blob;
      return origCreate.call(URL, blob);
    };
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {};

    exportReportCsv();

    URL.createObjectURL = origCreate;
    HTMLAnchorElement.prototype.click = origClick;
    return capturedBlob.text();
  });

  expect(csv).toContain('codigo,nombre,estado');
  expect(csv).toContain('P001,Caramelos Verdes,encontrado');
  expect(csv).toContain('P999,Producto desconocido,no_registrado');
});
