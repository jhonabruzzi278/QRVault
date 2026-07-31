// Registers the service worker and shows an "Actualizar" banner whenever a
// new version has been downloaded but the old one is still controlling the
// page — the user decides when to switch, instead of silently mixing old
// and new assets mid-session.
(function () {
  if (!('serviceWorker' in navigator)) return;

  // Only reload on "controllerchange" if the user actually asked for the
  // update via the banner below. Without this guard, a brand-new install
  // also fires "controllerchange" the moment the worker calls
  // clients.claim() in its own activate handler (going from "no
  // controller" to "controller"), which would silently reload every
  // first-time visitor's page for no reason.
  let userRequestedUpdate = false;

  function showUpdateBanner(onReload) {
    if (document.getElementById('sw-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.className = 'update-banner';
    banner.innerHTML =
      '<span>🔄 Hay una nueva versión de QRVault</span>' +
      '<button type="button" class="btn btn--primary update-banner__btn">Actualizar</button>';

    document.body.appendChild(banner);
    banner.querySelector('button').addEventListener('click', () => {
      userRequestedUpdate = true;
      onReload();
    });
    requestAnimationFrame(() => banner.classList.add('update-banner--visible'));
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js')
      .then((registration) => {
        function promptUpdate(worker) {
          showUpdateBanner(() => worker.postMessage('SKIP_WAITING'));
        }

        if (registration.waiting && navigator.serviceWorker.controller) {
          promptUpdate(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              promptUpdate(newWorker);
            }
          });
        });

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });
      })
      .catch(() => {});

    let hasReloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasReloaded || !userRequestedUpdate) return;
      hasReloaded = true;
      window.location.reload();
    });
  });
})();
