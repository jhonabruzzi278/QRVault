// Loaded first on every page. Catches errors that would otherwise fail
// silently (a blank screen, a button that just does nothing) and surfaces
// them to the user instead, while still logging the real detail to the
// console for debugging.
(function () {
  function notify(message) {
    console.error(message);

    let toastEl = document.getElementById('toast');
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'toast';
      document.body.appendChild(toastEl);
    }

    toastEl.textContent = '⚠️ Ocurrió un error inesperado. Intenta de nuevo.';
    toastEl.className = 'toast toast--error toast--visible';
    clearTimeout(notify._t);
    notify._t = setTimeout(() => {
      toastEl.className = 'toast';
    }, 3000);
  }

  window.addEventListener('error', (event) => {
    notify(event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    notify(reason && reason.message ? reason.message : String(reason));
  });
})();
