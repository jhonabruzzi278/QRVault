const { test, expect } = require('@playwright/test');

test('home page loads without console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/index.html');
  await page.waitForTimeout(500);

  expect(errors).toEqual([]);
  await expect(page.locator('#start-scan-btn')).toBeVisible();
});

test('Prueba 1 del spec: 15 productos registrados -> 15/15/0', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForTimeout(500);

  const result = await page.evaluate(async () => {
    for (const code of REGISTERED_CODES) {
      await handleDecodedCode(code);
    }
    buildReport();
    return {
      total: document.getElementById('report-total').textContent,
      found: document.getElementById('report-found').textContent,
      missing: document.getElementById('report-missing').textContent,
    };
  });

  expect(result).toEqual({ total: '15', found: '15', missing: '0' });
});

test('Prueba 2 del spec: 16 productos (15 + 1 no registrado) -> 16/15/1 con P016', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForTimeout(500);

  const result = await page.evaluate(async () => {
    for (const code of REGISTERED_CODES) {
      await handleDecodedCode(code);
    }
    await handleDecodedCode('P016');
    buildReport();
    return {
      total: document.getElementById('report-total').textContent,
      found: document.getElementById('report-found').textContent,
      missing: document.getElementById('report-missing').textContent,
      missingList: document.getElementById('report-missing-list').innerText,
    };
  });

  expect(result.total).toBe('16');
  expect(result.found).toBe('15');
  expect(result.missing).toBe('1');
  expect(result.missingList).toContain('P016');
});

test('Prueba 3 del spec: 20 productos -> 20/15/5 con P016-P020', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForTimeout(500);

  const result = await page.evaluate(async () => {
    for (const product of FULL_CATALOG) {
      await handleDecodedCode(product.code);
    }
    buildReport();
    return {
      total: document.getElementById('report-total').textContent,
      found: document.getElementById('report-found').textContent,
      missing: document.getElementById('report-missing').textContent,
      missingList: document.getElementById('report-missing-list').innerText,
    };
  });

  expect(result.total).toBe('20');
  expect(result.found).toBe('15');
  expect(result.missing).toBe('5');
  for (const code of ['P016', 'P017', 'P018', 'P019', 'P020']) {
    expect(result.missingList).toContain(code);
  }
});

test('re-escanear el mismo código no duplica el conteo', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForTimeout(500);

  const total = await page.evaluate(async () => {
    await handleDecodedCode('P001');
    await handleDecodedCode('P001');
    buildReport();
    return document.getElementById('report-total').textContent;
  });

  expect(total).toBe('1');
});

test('products.html renderiza los 20 QR con el split correcto de registrados', async ({ page }) => {
  await page.goto('/products.html');

  await expect(page.locator('.product-card')).toHaveCount(20);
  await expect(page.locator('#registered-count')).toHaveText('15');
  await expect(page.locator('#unregistered-count')).toHaveText('5');
  await expect(page.locator('.product-card--unregistered')).toHaveCount(5);
});
