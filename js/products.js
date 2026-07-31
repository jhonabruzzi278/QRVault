let inventoryDb = null;
let currentProducts = [];

function buildProductCard(product) {
  const card = document.createElement('div');
  card.className = `product-card${product.isRegistered ? '' : ' product-card--unregistered'}`;
  card.dataset.code = product.code;
  card.dataset.name = product.name.toLowerCase();

  const qr = qrcode(0, 'M');
  qr.addData(product.code);
  qr.make();
  const qrWrapper = document.createElement('div');
  qrWrapper.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2 });
  card.appendChild(qrWrapper);

  const codeEl = document.createElement('div');
  codeEl.className = 'product-card__code';
  codeEl.textContent = product.code;
  card.appendChild(codeEl);

  const nameEl = document.createElement('div');
  nameEl.className = 'product-card__name';
  nameEl.textContent = product.name + (product.isRegistered ? '' : ' (no registrado)');
  card.appendChild(nameEl);

  if (product.isRegistered) {
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'product-card__delete';
    deleteBtn.textContent = '🗑️ Quitar del inventario';
    deleteBtn.addEventListener('click', () => removeFromInventory(product.code));
    card.appendChild(deleteBtn);
  }

  return card;
}

function renderGrid(filterText) {
  const grid = document.getElementById('products-grid');
  const noResults = document.getElementById('no-results');
  const normalizedFilter = (filterText || '').trim().toLowerCase();

  grid.innerHTML = '';
  let registeredCount = 0;
  let unregisteredCount = 0;
  let visibleCount = 0;

  currentProducts.forEach(product => {
    product.isRegistered ? registeredCount++ : unregisteredCount++;

    const matchesFilter =
      !normalizedFilter ||
      product.code.toLowerCase().includes(normalizedFilter) ||
      product.name.toLowerCase().includes(normalizedFilter);

    if (!matchesFilter) return;

    visibleCount++;
    grid.appendChild(buildProductCard(product));
  });

  document.getElementById('registered-count').textContent = registeredCount;
  document.getElementById('unregistered-count').textContent = unregisteredCount;
  noResults.classList.toggle('hidden', visibleCount > 0);
}

async function loadProducts() {
  const dbProducts = await getAllProducts(inventoryDb);
  const dbCodes = new Set(dbProducts.map(p => p.code));

  const fromCatalog = FULL_CATALOG.map(product => ({
    ...product,
    isRegistered: dbCodes.has(product.code),
  }));

  const customOnly = dbProducts
    .filter(p => !FULL_CATALOG.some(c => c.code === p.code))
    .map(product => ({ ...product, isRegistered: true }));

  currentProducts = [...fromCatalog, ...customOnly].sort((a, b) => a.code.localeCompare(b.code));
}

async function refreshGrid(filterText) {
  await loadProducts();
  renderGrid(filterText);
}

async function removeFromInventory(code) {
  await deleteProduct(inventoryDb, code);
  await refreshGrid(document.getElementById('search-input').value);
}

async function addToInventory() {
  const codeInput = document.getElementById('new-product-code');
  const nameInput = document.getElementById('new-product-name');
  const code = codeInput.value.trim().toUpperCase();
  const name = nameInput.value.trim();

  if (!code || !name) return;

  await putProduct(inventoryDb, { code, name, description: '' });
  codeInput.value = '';
  nameInput.value = '';
  await refreshGrid(document.getElementById('search-input').value);
}

async function initProductsPage() {
  inventoryDb = await initInventoryDb();
  await refreshGrid('');

  document.getElementById('print-btn').addEventListener('click', () => window.print());
  document.getElementById('add-product-btn').addEventListener('click', addToInventory);
  document.getElementById('search-input').addEventListener('input', (event) => {
    renderGrid(event.target.value);
  });
}

document.addEventListener('DOMContentLoaded', initProductsPage);
