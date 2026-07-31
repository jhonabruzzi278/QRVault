let inventoryDb = null;
let html5QrCode = null;
let isScanning = false;
let currentFacingMode = 'environment';

// code -> { code, name, found }
const scannedProducts = new Map();

const els = {};

function cacheEls() {
  els.startBtn = document.getElementById('start-scan-btn');
  els.stopBtn = document.getElementById('stop-scan-btn');
  els.finishBtn = document.getElementById('finish-btn');
  els.resetBtn = document.getElementById('reset-btn');
  els.reader = document.getElementById('reader');
  els.scanScreen = document.getElementById('scan-screen');
  els.reportScreen = document.getElementById('report-screen');
  els.homeScreen = document.getElementById('home-screen');
  els.scannedList = document.getElementById('scanned-list');
  els.scannedCount = document.getElementById('scanned-count');
  els.toast = document.getElementById('toast');
  els.reportTotal = document.getElementById('report-total');
  els.reportFound = document.getElementById('report-found');
  els.reportMissing = document.getElementById('report-missing');
  els.reportMissingList = document.getElementById('report-missing-list');
  els.installBtn = document.getElementById('install-btn');
  els.iosInstallHint = document.getElementById('ios-install-hint');
  els.switchCameraBtn = document.getElementById('switch-camera-btn');
}

function isRunningStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function setupInstallPrompt() {
  if (isRunningStandalone() || !els.installBtn) return;

  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    els.installBtn.classList.remove('hidden');
  });

  els.installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    els.installBtn.classList.add('hidden');
  });

  window.addEventListener('appinstalled', () => {
    els.installBtn.classList.add('hidden');
  });

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos && els.iosInstallHint) {
    els.iosInstallHint.classList.remove('hidden');
  }
}

function showToast(message, kind) {
  els.toast.textContent = message;
  els.toast.className = `toast toast--${kind} toast--visible`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    els.toast.className = 'toast';
  }, 2000);
}

function switchScreen(screenEl) {
  [els.homeScreen, els.scanScreen, els.reportScreen].forEach(s => s.classList.add('hidden'));
  screenEl.classList.remove('hidden');
  screenEl.classList.remove('screen-enter');
  void screenEl.offsetWidth; // restart the CSS animation
  screenEl.classList.add('screen-enter');
}

function renderScannedList() {
  els.scannedCount.textContent = scannedProducts.size;
  els.scannedList.innerHTML = '';
  const entries = Array.from(scannedProducts.values()).reverse();
  for (const item of entries) {
    const li = document.createElement('li');
    li.className = `scanned-item scanned-item--${item.found ? 'found' : 'missing'}`;
    li.innerHTML = `
      <span class="scanned-item__code">${item.code}</span>
      <span class="scanned-item__name">${item.name}</span>
      <span class="scanned-item__status">${item.found ? '✔ Encontrado' : '✖ No registrado'}</span>
    `;
    els.scannedList.appendChild(li);
  }
}

async function handleDecodedCode(rawText) {
  const code = rawText.trim().toUpperCase();

  if (scannedProducts.has(code)) {
    showToast(`Ya escaneado: ${code}`, 'warning');
    return;
  }

  const catalogEntry = FULL_CATALOG.find(p => p.code === code);
  const dbEntry = await lookupProduct(inventoryDb, code);
  const found = Boolean(dbEntry);
  const name = (dbEntry && dbEntry.name) || (catalogEntry && catalogEntry.name) || 'Producto desconocido';

  scannedProducts.set(code, { code, name, found });
  renderScannedList();
  showToast(found ? `✔ ${code} — ${name}` : `✖ ${code} — no registrado`, found ? 'success' : 'error');
}

async function startCamera(facingMode) {
  html5QrCode = new Html5Qrcode('reader');
  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  await html5QrCode.start(
    { facingMode },
    config,
    (decodedText) => handleDecodedCode(decodedText),
    () => {}
  );

  currentFacingMode = facingMode;
  els.switchCameraBtn.classList.remove('hidden');
}

async function startScanning() {
  if (isScanning) return;
  isScanning = true;
  els.startBtn.classList.add('hidden');
  els.stopBtn.classList.remove('hidden');

  try {
    await startCamera(currentFacingMode);
  } catch (err) {
    showToast('No se pudo acceder a la cámara.', 'error');
    isScanning = false;
    els.startBtn.classList.remove('hidden');
    els.stopBtn.classList.add('hidden');
  }
}

async function stopCameraOnly() {
  if (!html5QrCode) return;
  try {
    await html5QrCode.stop();
    await html5QrCode.clear();
  } catch (err) {
    // cámara ya detenida
  }
}

async function stopScanning() {
  if (!isScanning) return;
  await stopCameraOnly();
  isScanning = false;
  els.startBtn.classList.remove('hidden');
  els.stopBtn.classList.add('hidden');
  els.switchCameraBtn.classList.add('hidden');
}

async function switchCamera() {
  if (!isScanning) return;
  const nextFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  try {
    await stopCameraOnly();
    await startCamera(nextFacingMode);
  } catch (err) {
    showToast('No se pudo cambiar de cámara.', 'error');
    try {
      await startCamera(currentFacingMode);
    } catch (fallbackErr) {
      // sin cámara disponible; el usuario puede reintentar con "Escanear"
    }
  }
}

function buildReport() {
  const items = Array.from(scannedProducts.values());
  const total = items.length;
  const found = items.filter(i => i.found).length;
  const missing = items.filter(i => !i.found);

  els.reportTotal.textContent = total;
  els.reportFound.textContent = found;
  els.reportMissing.textContent = missing.length;

  els.reportMissingList.innerHTML = '';
  if (missing.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Ninguno';
    li.className = 'report-missing__empty';
    els.reportMissingList.appendChild(li);
  } else {
    missing.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.code} – ${item.name}`;
      els.reportMissingList.appendChild(li);
    });
  }
}

async function finishScanning() {
  await stopScanning();
  buildReport();
  switchScreen(els.reportScreen);
}

function resetSession() {
  scannedProducts.clear();
  renderScannedList();
  switchScreen(els.homeScreen);
}

async function init() {
  cacheEls();
  inventoryDb = await initInventoryDb();
  setupInstallPrompt();

  els.startBtn.addEventListener('click', () => {
    switchScreen(els.scanScreen);
    startScanning();
  });
  els.stopBtn.addEventListener('click', stopScanning);
  els.finishBtn.addEventListener('click', finishScanning);
  els.resetBtn.addEventListener('click', resetSession);
  els.switchCameraBtn.addEventListener('click', switchCamera);
}

document.addEventListener('DOMContentLoaded', init);
