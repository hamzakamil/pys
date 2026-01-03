# 📱 Mobil Uygulama Kurulum Rehberi

Bu rehber, Personel Yönetim Sistemi'nin iOS ve Android mobil uygulamalarını oluşturma ve geliştirme sürecini açıklar.

## 🎯 Genel Bakış

- **Web**: Tarayıcıdan erişildiğinde normal web sayfası çalışır (tüm roller için)
- **Mobil Uygulama**: iOS/Android uygulaması indirilip kurulduğunda employee rolü için mobil ekranlar gösterilir
- **Teknoloji**: Capacitor (Ionic) kullanılarak Vue.js uygulaması native mobil uygulamaya dönüştürülür

## 📋 Gereksinimler

### iOS Geliştirme
- macOS (Xcode için gerekli)
- Xcode 14+ 
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer hesabı (App Store'da yayınlamak için)

### Android Geliştirme
- Android Studio
- Java JDK 11+
- Android SDK
- Android SDK Platform Tools

## 🚀 Kurulum Adımları

### 1. Bağımlılıkları Yükle

```bash
cd ui
npm install
```

### 2. Projeyi Build Et

```bash
npm run build
```

Bu komut `dist/` klasöründe production build oluşturur.

### 3. iOS Platformunu Ekle

```bash
npm run cap:add:ios
```

Bu komut:
- `ios/` klasörünü oluşturur
- iOS native projesini hazırlar
- Gerekli native bağımlılıkları yükler

### 4. Android Platformunu Ekle

```bash
npm run cap:add:android
```

Bu komut:
- `android/` klasörünü oluşturur
- Android native projesini hazırlar
- Gerekli native bağımlılıkları yükler

### 5. Capacitor Sync

Her build sonrası değişiklikleri native projelere aktarmak için:

```bash
npm run cap:sync
```

Bu komut:
- Web build'i native projelere kopyalar
- Native plugin'leri günceller
- Capacitor config değişikliklerini uygular

## 🔨 Geliştirme ve Build

### iOS

1. **Xcode'da Aç:**
   ```bash
   npm run cap:open:ios
   ```

2. **Xcode'da:**
   - Proje açıldıktan sonra simulator veya gerçek cihaz seçin
   - Run butonuna basın (⌘R)
   - Veya: `npm run cap:build:ios` (build + sync + aç)

### Android

1. **Android Studio'da Aç:**
   ```bash
   npm run cap:open:android
   ```

2. **Android Studio'da:**
   - Proje açıldıktan sonra emulator veya gerçek cihaz seçin
   - Run butonuna basın
   - Veya: `npm run cap:build:android` (build + sync + aç)

## 📝 Önemli Notlar

### Platform Tespiti

Uygulama otomatik olarak platform tespiti yapar:
- **Web**: `shouldUseMobileLayout()` → `false` → Normal web sayfası
- **Native App**: `shouldUseMobileLayout()` → `true` → Mobil ekranlar

Kod: `ui/src/utils/platform.js`

### Router Yönlendirmesi

- **Web'de employee**: Normal web dashboard'a gider
- **Native app'te employee**: Mobil ekranlara (`/mobile`) yönlendirilir
- **Diğer roller**: Her zaman normal web sayfası

Kod: `ui/src/router/index.js`

### API Bağlantısı

Mobil uygulamada API base URL'i değiştirilmelidir:

**Geliştirme:**
- `capacitor.config.ts` içinde `server.url` ayarlanabilir
- Veya `ui/src/services/api.js` içinde dinamik URL

**Production:**
- Backend URL'i production sunucusuna işaret etmeli
- HTTPS kullanılmalı

## 🔧 Yapılandırma

### Capacitor Config

`ui/capacitor.config.ts` dosyasında:
- `appId`: Uygulama paket ID'si
- `appName`: Uygulama adı
- `webDir`: Build çıktı klasörü (dist)
- `server`: API URL ayarları

### iOS Yapılandırması

`ios/App/App/Info.plist` dosyasında:
- Konum izinleri
- Kamera izinleri (gerekirse)
- Diğer native özellikler

### Android Yapılandırması

`android/app/src/main/AndroidManifest.xml` dosyasında:
- İzinler
- Network security config
- Diğer native özellikler

## 📦 Build ve Yayınlama

### iOS

1. **Archive Oluştur:**
   - Xcode'da Product → Archive
   - Organizer'da archive'ı seç
   - "Distribute App" butonuna bas

2. **App Store'a Yükle:**
   - App Store Connect'e yükle
   - TestFlight ile test et
   - Yayınla

### Android

1. **APK/AAB Oluştur:**
   ```bash
   cd android
   ./gradlew assembleRelease  # APK için
   ./gradlew bundleRelease    # AAB için (Play Store)
   ```

2. **Play Store'a Yükle:**
   - Google Play Console'a giriş yap
   - Yeni uygulama oluştur
   - AAB dosyasını yükle
   - Yayınla

## 🐛 Sorun Giderme

### iOS

- **CocoaPods hatası**: `cd ios/App && pod install`
- **Signing hatası**: Xcode'da Signing & Capabilities'den düzelt
- **Build hatası**: Clean build folder (⌘⇧K)

### Android

- **Gradle hatası**: `cd android && ./gradlew clean`
- **SDK hatası**: Android Studio'da SDK Manager'dan eksik SDK'ları yükle
- **Build hatası**: `./gradlew clean build`

### Capacitor

- **Sync hatası**: `npm run cap:sync` tekrar çalıştır
- **Plugin hatası**: `npm run cap:copy` sonra `npm run cap:sync`

## 📚 Kaynaklar

- [Capacitor Dokümantasyonu](https://capacitorjs.com/docs)
- [iOS Geliştirme Rehberi](https://developer.apple.com/documentation/)
- [Android Geliştirme Rehberi](https://developer.android.com/docs)

## ✅ Test Checklist

- [ ] iOS'ta giriş/çıkış çalışıyor
- [ ] Android'de giriş/çıkış çalışıyor
- [ ] Konum izinleri doğru çalışıyor
- [ ] Bildirimler çalışıyor
- [ ] İzin talepleri oluşturulabiliyor
- [ ] Kalan izinler görüntülenebiliyor
- [ ] Giriş/çıkış geçmişi görüntülenebiliyor
- [ ] Profil güncellenebiliyor
- [ ] Web'de normal sayfa çalışıyor (employee için)
- [ ] Native app'te mobil ekranlar çalışıyor (employee için)

