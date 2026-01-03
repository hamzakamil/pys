// Install Prompt - PWA yükleme teşviki
let deferredPrompt = null

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault()
  // Stash the event so it can be triggered later
  deferredPrompt = e
  // Show install button or banner
  showInstallPrompt()
})

function showInstallPrompt() {
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return // Already installed
  }

  // Create install banner
  const banner = document.createElement('div')
  banner.id = 'pwa-install-banner'
  banner.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #2563eb;
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    max-width: 90%;
    text-align: center;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
  `
  
  banner.innerHTML = `
    <div style="flex: 1;">
      <strong>Uygulamayı Ana Ekrana Ekleyin</strong>
      <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">
        Daha hızlı erişim için yükleyin
      </div>
    </div>
    <button id="pwa-install-btn" style="
      background: white;
      color: #2563eb;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
    ">Yükle</button>
    <button id="pwa-dismiss-btn" style="
      background: transparent;
      color: white;
      border: none;
      padding: 8px;
      cursor: pointer;
      font-size: 18px;
    ">×</button>
  `
  
  document.body.appendChild(banner)
  
  // Install button
  document.getElementById('pwa-install-btn').addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log(`User response to install prompt: ${outcome}`)
      deferredPrompt = null
      banner.remove()
    }
  })
  
  // Dismiss button
  document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
    banner.remove()
    // Store dismissal in localStorage
    localStorage.setItem('pwa-install-dismissed', Date.now())
  })
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (banner.parentNode) {
      banner.remove()
    }
  }, 10000)
}

// Check if user previously dismissed
if (localStorage.getItem('pwa-install-dismissed')) {
  const dismissedTime = parseInt(localStorage.getItem('pwa-install-dismissed'))
  const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
  // Show again after 7 days
  if (daysSinceDismissed < 7) {
    // Don't show
  } else {
    localStorage.removeItem('pwa-install-dismissed')
  }
}

// Handle successful installation
window.addEventListener('appinstalled', () => {
  console.log('PWA installed successfully')
  deferredPrompt = null
  const banner = document.getElementById('pwa-install-banner')
  if (banner) {
    banner.remove()
  }
})


