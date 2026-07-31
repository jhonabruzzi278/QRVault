const grid = document.getElementById('products-grid');
let registeredCount = 0;
let unregisteredCount = 0;

FULL_CATALOG.forEach(product => {
  const isRegistered = REGISTERED_CODES.includes(product.code);
  isRegistered ? registeredCount++ : unregisteredCount++;

  const card = document.createElement('div');
  card.className = `product-card${isRegistered ? '' : ' product-card--unregistered'}`;

  const qr = qrcode(0, 'M');
  qr.addData(product.code);
  qr.make();
  const qrWrapper = document.createElement('div');
  qrWrapper.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2 });
  card.appendChild(qrWrapper);

  const codeEl = document.createElement('div');
  codeEl.className = 'product-card__code';
  codeEl.textContent = product.code;
  const nameEl = document.createElement('div');
  nameEl.className = 'product-card__name';
  nameEl.textContent = product.name + (isRegistered ? '' : ' (no registrado)');
  card.appendChild(codeEl);
  card.appendChild(nameEl);
  grid.appendChild(card);
});

document.getElementById('registered-count').textContent = registeredCount;
document.getElementById('unregistered-count').textContent = unregisteredCount;

document.getElementById('print-btn').addEventListener('click', () => window.print());
