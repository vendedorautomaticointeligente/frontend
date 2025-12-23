const isBrowser = typeof window !== 'undefined'
const supportsSW = isBrowser && 'serviceWorker' in navigator
let safeServiceWorkerRegistered = false

const log = (...args: unknown[]) => {
  if (!import.meta.env.DEV) return
  console.info('[serviceWorkerCleanup]', ...args)
}

const registerSafeServiceWorker = async () => {
  if (!supportsSW || safeServiceWorkerRegistered) return
  const protocol = window.location?.protocol
  if (protocol !== 'http:' && protocol !== 'https:') {
    return
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    log('safe sw registered', registration.scope)
    safeServiceWorkerRegistered = true
  } catch (error) {
    console.warn('[serviceWorkerCleanup] failed to register safe sw', error)
  }
}

export async function cleanupServiceWorkers() {
  if (!supportsSW) return

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    if (registrations.length) {
      await Promise.all(
        registrations.map(async (registration) => {
          try {
            const scope = registration.scope
            const result = await registration.unregister()
            log(`unregister ${scope}`, result ? 'success' : 'failed')
          } catch (error) {
            console.warn('[serviceWorkerCleanup] failed to unregister', error)
          }
        })
      )
    } else {
      log('no registrations found')
    }
  } catch (error) {
    console.warn('[serviceWorkerCleanup] cleanup skipped', error)
  } finally {
    registerSafeServiceWorker()
  }
}
