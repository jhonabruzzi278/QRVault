// Capa de acceso a datos: IndexedDB almacena únicamente los productos "registrados"
// (P001-P015), simulando el inventario real contra el cual se valida cada escaneo.
const DB_NAME = 'qrvault-inventory';
const DB_VERSION = 1;
const STORE_NAME = 'products';

function openInventoryDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'code' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function seedInventoryIfEmpty(db) {
  const count = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (count > 0) return;

  const registeredProducts = FULL_CATALOG.filter(p => REGISTERED_CODES.includes(p.code));

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    registeredProducts.forEach(p => store.put(p));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function initInventoryDb() {
  const db = await openInventoryDb();
  await seedInventoryIfEmpty(db);
  return db;
}

function lookupProduct(db, code) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(code);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
