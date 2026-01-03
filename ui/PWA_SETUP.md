# PWA (Progressive Web App) Kurulum Rehberi

## ✅ Tamamlanan Adımlar

1. ✅ `manifest.json` oluşturuldu
2. ✅ Service Worker (`sw.js`) eklendi
3. ✅ Platform detection utility eklendi
4. ✅ Router'da PWA/Web ayrımı yapıldı
5. ✅ Install prompt script eklendi
6. ✅ HTML meta tag'leri eklendi

## 📱 Icon Dosyaları

Icon dosyalarını `ui/public/icons/` klasörüne eklemeniz gerekiyor:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### Icon Oluşturma

1. 512x512 piksel boyutunda bir logo hazırlayın
2. Online tool kullanın:
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator
3. Tüm boyutları oluşturup `ui/public/icons/` klasörüne ekleyin

## 🚀 Kullanım

### Web Tarayıcıdan

1. Normal web tarayıcıdan giriş yapıldığında → Web arayüzü gösterilir
2. Employee rolü ile giriş yapıldığında → `/mobile` route'una yönlendirilir (web görünümünde)

### PWA Olarak Yükleme

#### Android (Chrome)

1. Tarayıcıda siteyi açın
2. Menü (⋮) → "Ana ekrana ekle" veya "Yükle" seçeneğini tıklayın
3. Uygulama ana ekrana eklenecek
4. Açıldığında standalone mode'da çalışacak ve mobil arayüz gösterilecek

#### iOS (Safari)

1. Safari'de siteyi açın
2. Paylaş butonu (□↑) → "Ana Ekrana Ekle"
3. Uygulama ana ekrana eklenecek
4. Açıldığında standalone mode'da çalışacak ve mobil arayüz gösterilecek

### Test Etme

1. **Web Test:**
   - Normal tarayıcıdan `http://localhost:5173` açın
   - Web arayüzü görünmeli

2. **PWA Test (Chrome DevTools):**
   - F12 → Application tab
   - Manifest ve Service Worker'ı kontrol edin
   - "Add to homescreen" simüle edin

3. **Gerçek Cihaz Test:**
   - HTTPS gereklidir (production'da)
   - Development için ngrok veya benzeri kullanın
   - Veya production build alıp test edin

## 🔧 Yapılandırma

### Manifest Ayarları

`ui/public/manifest.json` dosyasında:
- `start_url`: PWA açıldığında başlangıç URL'i (`/mobile`)
- `display`: `standalone` (native app gibi)
- `theme_color`: Status bar rengi
- `icons`: App icon'ları

### Service Worker

`ui/public/sw.js` dosyası:
- Basit cache stratejisi
- API istekleri her zaman network'ten
- Static dosyalar cache'lenir

## 📦 Production Build

```bash
cd ui
npm run build
```

Build sonrası `dist` klasöründe:
- `manifest.json`
- `sw.js`
- Icon dosyaları
- Tüm static dosyalar

## 🌐 Deployment

1. Build alın: `npm run build`
2. `dist` klasörünü web sunucuya yükleyin
3. HTTPS gereklidir (PWA için zorunlu)
4. Service Worker çalışması için root'ta olmalı

## ⚠️ Önemli Notlar

- **HTTPS Gereklidir:** Production'da PWA çalışması için HTTPS zorunludur
- **Service Worker:** Sadece production build'de aktif (main.js'de kontrol var)
- **Icon'lar:** Gerçek icon'ları eklemeyi unutmayın
- **Standalone Detection:** `platform.js` dosyası standalone mode'u algılar

## 🐛 Sorun Giderme

### Service Worker Kayıt Olmuyor

- HTTPS kontrolü yapın
- Browser console'da hata var mı kontrol edin
- `sw.js` dosyasının root'ta olduğundan emin olun

### Install Prompt Görünmüyor

- Chrome'da `chrome://flags/#enable-desktop-pwas` aktif mi kontrol edin
- `beforeinstallprompt` event'inin tetiklendiğini kontrol edin
- Daha önce yüklenmiş olabilir (uninstall edin)

### Mobil Arayüz Görünmüyor

- Standalone mode'da mı kontrol edin (`platform.js`)
- Router'da yönlendirme doğru mu kontrol edin
- User role'ü `employee` mi kontrol edin


