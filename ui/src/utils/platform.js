/**
 * Platform detection utilities
 * Detects if the app is running as a PWA (installed app) or in a web browser
 */

/**
 * Check if app is running in standalone mode (PWA installed)
 * @returns {boolean}
 */
export function isStandalone() {
  // iOS Safari
  if (window.navigator.standalone === true) {
    return true
  }
  
  // Android Chrome
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }
  
  // Windows/Desktop PWA
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }
  
  return false
}

/**
 * Check if device is mobile
 * @returns {boolean}
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Check if device is iOS
 * @returns {boolean}
 */
export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

/**
 * Check if device is Android
 * @returns {boolean}
 */
export function isAndroid() {
  return /Android/.test(navigator.userAgent)
}

/**
 * Determine if mobile layout should be used
 * Returns true if:
 * 1. App is installed as PWA (standalone mode) AND user is employee
 * 2. OR mobile device AND user is employee AND explicitly on mobile route
 * @returns {boolean}
 */
export function shouldUseMobileLayout() {
  // If standalone (PWA installed), always use mobile layout for employees
  if (isStandalone()) {
    return true
  }
  
  // For web browsers, check if we're on mobile route
  // This allows web users to access mobile interface if they navigate to /mobile
  if (isMobileDevice() && window.location.pathname.startsWith('/mobile')) {
    return true
  }
  
  return false
}

/**
 * Check if service worker is supported
 * @returns {boolean}
 */
export function isServiceWorkerSupported() {
  return 'serviceWorker' in navigator
}

/**
 * Register service worker
 */
export async function registerServiceWorker() {
  if (!isServiceWorkerSupported()) {
    console.log('Service Worker desteklenmiyor')
    return
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker kayıtlı:', registration.scope)
    
    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available, prompt user to refresh
          console.log('Yeni sürüm mevcut')
        }
      })
    })
  } catch (error) {
    console.error('Service Worker kayıt hatası:', error)
  }
}
