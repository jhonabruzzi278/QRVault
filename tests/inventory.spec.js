const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/products.html');
  await page.evaluate(() => indexedDB.deleteDatabase('qrvault-inventory'));
  await page.reload();
  await page.waitForTimeout(500);
});

test('agregar un producto nuevo lo muestra como registrado', async ({ page }) => {
  await page.fill('#new-product-code', 'p021');
  await page.fill('#new-product-name', 'Producto Nuevo');
  await page.click('#add-product-btn');
  await page.waitForTimeout(200);

  const card = page.locator('[data-code="P021"]');
  await expect(card).toBeVisible();
  await expect(card).not.toHaveClass(/product-card--unregistered/);
  await expect(page.locator('#registered-count')).toHaveText('16');
});

test('quitar un producto del inventario lo marca como no registrado', async ({ page }) => {
  await page.click('[data-code="P001"] .product-card__delete');
  await page.waitForTimeout(200);

  const card = page.locator('[data-code="P001"]');
  await expect(card).toHaveClass(/product-card--unregistered/);
  await expect(page.locator('#registered-count')).toHaveText('14');
  await expect(page.locator('#unregistered-count')).toHaveText('6');
});

test('el buscador filtra por código y por nombre', async ({ page }) => {
  await page.fill('#search-input', 'yogurt');
  await expect(page.locator('.products-grid .product-card')).toHaveCount(1);
  await expect(page.locator('#no-results')).toHaveClass(/hidden/);

  await page.fill('#search-input', 'p003');
  await expect(page.locator('.products-grid .product-card')).toHaveCount(1);

  await page.fill('#search-input', 'no-existe-este-producto');
  await expect(page.locator('.products-grid .product-card')).toHaveCount(0);
  await expect(page.locator('#no-results')).not.toHaveClass(/hidden/);
});
