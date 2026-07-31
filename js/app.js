let inventoryDb = null;
let html5QrCode = null;
let isScanning = false;
let currentFacingMode = 'environment';
let torchOn = false;

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
  els.torchBtn = document.getElementById('torch-btn');
  els.switchCameraBtn = document.getElementById('switch-camera-btn');
  els.diagBtn = document.getElementById('diag-btn');
  els.diagOverlay = document.getElementById('diag-overlay');
  els.diagOutput = document.getElementById('diag-output');
  els.diagCloseBtn = document.getElementById('diag-close-btn');
  els.diagCopyBtn = document.getElementById('diag-copy-btn');
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

function getActiveVideoTrack() {
  try {
    const videoEl = els.reader.querySelector('video');
    const stream = videoEl && videoEl.srcObject;
    return (stream && stream.getVideoTracks()[0]) || null;
  } catch (err) {
    return null;
  }
}

// Some Android/Chrome + html5-qrcode version combinations never report
// torch support through the library's own wrapper even when the camera
// track genuinely has it, so this also asks the native MediaStreamTrack
// directly as a fallback before giving up.
function detectTorchSupport() {
  try {
    const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
    if (capabilities.torchFeature().isSupported()) {
      els.torchBtn.classList.remove('hidden');
      return true;
    }
  } catch (err) {
    // wrapper no disponible todavía; se intenta el track nativo abajo
  }

  const track = getActiveVideoTrack();
  if (track && typeof track.getCapabilities === 'function') {
    try {
      const nativeCaps = track.getCapabilities();
      if (nativeCaps && nativeCaps.torch) {
        els.torchBtn.classList.remove('hidden');
        return true;
      }
    } catch (err) {
      // getCapabilities no soportado en este navegador/dispositivo
    }
  }

  els.torchBtn.classList.add('hidden');
  return false;
}

// Some Android/Chrome combinations don't report the "torch" capability on
// the video track immediately after start() resolves — the capability only
// becomes available once the stream is actually flowing frames. Re-check on
// the video's "loadeddata"/"playing" events plus a couple of delayed
// fallbacks instead of a single immediate check right after start().
function scheduleTorchDetection() {
  let found = false;
  const attempt = () => {
    if (found) return;
    if (detectTorchSupport()) found = true;
  };

  const videoEl = els.reader.querySelector('video');
  if (videoEl) {
    videoEl.addEventListener('loadeddata', attempt, { once: true });
    videoEl.addEventListener('playing', attempt, { once: true });
  }

  attempt();
  setTimeout(attempt, 500);
  setTimeout(attempt, 1500);
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (err) {
    return String(value);
  }
}

function runTorchDiagnostics() {
  const lines = [];
  lines.push('User-Agent:');
  lines.push(navigator.userAgent);
  lines.push('');

  const supportedConstraints =
    navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints
      ? navigator.mediaDevices.getSupportedConstraints()
      : null;
  lines.push('getSupportedConstraints().torch: ' + (supportedConstraints ? supportedConstraints.torch : 'n/a'));
  lines.push('');

  lines.push('--- html5-qrcode wrapper ---');
  try {
    const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
    const torchFeature = capabilities.torchFeature();
    lines.push('torchFeature.isSupported(): ' + torchFeature.isSupported());
    if (typeof torchFeature.value === 'function') {
      lines.push('torchFeature.value(): ' + torchFeature.value());
    }
  } catch (err) {
    lines.push('Error: ' + (err && err.message ? err.message : err));
  }
  lines.push('');

  lines.push('--- Native MediaStreamTrack ---');
  const track = getActiveVideoTrack();
  if (!track) {
    lines.push('No se encontró un video track activo (¿la cámara sigue iniciando?).');
  } else {
    lines.push('label: ' + track.label);
    lines.push('readyState: ' + track.readyState);
    lines.push('typeof track.getCapabilities: ' + typeof track.getCapabilities);
    if (typeof track.getCapabilities === 'function') {
      try {
        lines.push('getCapabilities(): ' + safeJson(track.getCapabilities()));
      } catch (err) {
        lines.push('getCapabilities() error: ' + (err && err.message ? err.message : err));
      }
    }
    if (typeof track.getSettings === 'function') {
      try {
        lines.push('');
        lines.push('getSettings(): ' + safeJson(track.getSettings()));
      } catch (err) {
        // ignore
      }
    }
  }

  els.diagOutput.textContent = lines.join('\n');
  els.diagOverlay.classList.remove('hidden');
}

async function startCamera(facingMode) {
  html5QrCode = new Html5Qrcode('reader');

  // html5-qrcode requires cameraIdOrConfig (1st arg) to have exactly one
  // key, so facingMode alone goes there. To also request a higher
  // resolution — low-res capture makes some Android/Chrome pipelines omit
  // "torch" from getCapabilities() even on hardware that has it — it has
  // to go through config.videoConstraints instead, which *replaces* the
  // 1st-arg constraint entirely when present, so facingMode is repeated
  // inside it too.
  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    videoConstraints: {
      facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };

  await html5QrCode.start(
    { facingMode },
    config,
    (decodedText) => handleDecodedCode(decodedText),
    () => {}
  );

  currentFacingMode = facingMode;
  torchOn = false;
  els.torchBtn.textContent = '🔦 Linterna';
  els.torchBtn.classList.add('hidden');
  scheduleTorchDetection();
  els.switchCameraBtn.classList.remove('hidden');
  els.diagBtn.classList.remove('hidden');
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
  els.torchBtn.classList.add('hidden');
  els.switchCameraBtn.classList.add('hidden');
  els.diagBtn.classList.add('hidden');
}

async function toggleTorch() {
  if (!isScanning || !html5QrCode) return;
  const nextState = !torchOn;

  // Try the library's wrapper first.
  try {
    const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
    const torchFeature = capabilities.torchFeature();
    if (torchFeature.isSupported()) {
      await torchFeature.apply(nextState);
      torchOn = nextState;
      els.torchBtn.textContent = torchOn ? '🔦 Apagar linterna' : '🔦 Linterna';
      return;
    }
  } catch (err) {
    // sigue con el fallback nativo
  }

  // Fallback: apply the constraint directly on the native video track.
  const track = getActiveVideoTrack();
  if (track) {
    try {
      await track.applyConstraints({ advanced: [{ torch: nextState }] });
      torchOn = nextState;
      els.torchBtn.textContent = torchOn ? '🔦 Apagar linterna' : '🔦 Linterna';
      return;
    } catch (err) {
      showToast('No se pudo controlar la linterna.', 'error');
      return;
    }
  }

  showToast('Este dispositivo no tiene linterna disponible.', 'warning');
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
  els.torchBtn.addEventListener('click', toggleTorch);
  els.switchCameraBtn.addEventListener('click', switchCamera);
  els.diagBtn.addEventListener('click', runTorchDiagnostics);
  els.diagCloseBtn.addEventListener('click', () => els.diagOverlay.classList.add('hidden'));
  els.diagCopyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.diagOutput.textContent);
      showToast('Diagnóstico copiado.', 'success');
    } catch (err) {
      showToast('No se pudo copiar automáticamente.', 'warning');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
