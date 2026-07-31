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
  els.historyScreen = document.getElementById('history-screen');
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
  els.manualCodeInput = document.getElementById('manual-code-input');
  els.manualCodeBtn = document.getElementById('manual-code-btn');
  els.exportCsvBtn = document.getElementById('export-csv-btn');
  els.navHomeBtn = document.getElementById('nav-home-btn');
  els.navHistoryBtn = document.getElementById('nav-history-btn');
  els.historyBackBtn = document.getElementById('history-back-btn');
  els.historyList = document.getElementById('history-list');
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

function updateNavActiveState(screenEl) {
  const isHistory = screenEl === els.historyScreen;
  els.navHomeBtn.classList.toggle('sidebar-nav__item--active', !isHistory);
  els.navHistoryBtn.classList.toggle('sidebar-nav__item--active', isHistory);
}

function switchScreen(screenEl) {
  [els.homeScreen, els.scanScreen, els.reportScreen, els.historyScreen].forEach(s => s.classList.add('hidden'));
  screenEl.classList.remove('hidden');
  screenEl.classList.remove('screen-enter');
  void screenEl.offsetWidth; // restart the CSS animation
  screenEl.classList.add('screen-enter');
  updateNavActiveState(screenEl);
}

// Short beep via Web Audio API — no audio file to fetch/cache, and it works
// offline just like everything else in this PWA.
function playBeep(success) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = success ? 880 : 220;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
    oscillator.onended = () => ctx.close();
  } catch (err) {
    // audio no disponible; el feedback visual/háptico sigue funcionando
  }
}

function triggerScanFeedback(found) {
  if (navigator.vibrate) {
    navigator.vibrate(found ? 60 : [40, 60, 40]);
  }
  playBeep(found);
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
  if (!code) return;

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
  triggerScanFeedback(found);
  showToast(found ? `✔ ${code} — ${name}` : `✖ ${code} — no registrado`, found ? 'success' : 'error');
}

function handleManualEntry() {
  const value = els.manualCodeInput.value;
  if (!value.trim()) return;
  handleDecodedCode(value);
  els.manualCodeInput.value = '';
  els.manualCodeInput.focus();
}

async function startCamera(facingMode) {
  html5QrCode = new Html5Qrcode('reader');
  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    formatsToSupport: [
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
    ],
  };

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

function csvEscape(value) {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function exportReportCsv() {
  const items = Array.from(scannedProducts.values());
  const rows = [['codigo', 'nombre', 'estado']];
  items.forEach(item => {
    rows.push([item.code, item.name, item.found ? 'encontrado' : 'no_registrado']);
  });

  const csvContent = rows.map(row => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  link.href = url;
  link.download = `qrvault-reporte-${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function finishScanning() {
  await stopScanning();
  buildReport();

  const items = Array.from(scannedProducts.values());
  await saveSession(inventoryDb, {
    date: new Date().toISOString(),
    total: items.length,
    found: items.filter(i => i.found).length,
    missing: items.filter(i => !i.found),
  });

  switchScreen(els.reportScreen);
}

function resetSession() {
  scannedProducts.clear();
  renderScannedList();
  switchScreen(els.homeScreen);
}

function formatSessionDate(isoDate) {
  try {
    return new Date(isoDate).toLocaleString();
  } catch (err) {
    return isoDate;
  }
}

async function showHistoryScreen() {
  const sessions = await getAllSessions(inventoryDb);
  els.historyList.innerHTML = '';

  if (sessions.length === 0) {
    const li = document.createElement('li');
    li.className = 'history-item history-item--empty';
    li.textContent = 'Todavía no hay sesiones de escaneo guardadas.';
    els.historyList.appendChild(li);
  } else {
    sessions.forEach(session => {
      const li = document.createElement('li');
      li.className = 'history-item';
      const missingCodes = session.missing.map(m => m.code).join(', ') || 'Ninguno';
      li.innerHTML = `
        <div class="history-item__date">${formatSessionDate(session.date)}</div>
        <div class="history-item__stats">
          <span>${session.total} escaneados</span>
          <span>${session.found} encontrados</span>
          <span>${session.missing.length} fuera de BD</span>
        </div>
        <div class="history-item__missing">${missingCodes}</div>
      `;
      els.historyList.appendChild(li);
    });
  }

  switchScreen(els.historyScreen);
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
  els.manualCodeBtn.addEventListener('click', handleManualEntry);
  els.manualCodeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleManualEntry();
  });
  els.exportCsvBtn.addEventListener('click', exportReportCsv);
  els.navHomeBtn.addEventListener('click', () => switchScreen(els.homeScreen));
  els.navHistoryBtn.addEventListener('click', showHistoryScreen);
  els.historyBackBtn.addEventListener('click', () => switchScreen(els.homeScreen));

  if (new URLSearchParams(window.location.search).get('view') === 'history') {
    showHistoryScreen();
  }
}

document.addEventListener('DOMContentLoaded', init);
