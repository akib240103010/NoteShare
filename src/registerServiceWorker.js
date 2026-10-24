/**
 * registerServiceWorker.js
 * Registers the NoteShare Progressive Web App (PWA) Service Worker
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Automatically reload when a new service worker version activates so user gets fresh code immediately
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Trigger immediate check for newer deployments
        registration.update().catch(() => {});

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('NoteShare PWA update installed.');
                if (!refreshing) {
                  refreshing = true;
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('Service Worker registration skipped or failed:', error);
      });
  });
}
