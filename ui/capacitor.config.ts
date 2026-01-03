// capacitor.config.ts güncel örneği
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.company.personelyonetim',
  appName: 'Personel Yönetim',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    // Konum için gerekli plugin
    Geolocation: {
      // Android'de konum izni mesajı
      androidAlwaysUsesLocationPermission: false,
    },
    // Kamera için (gerekirse)
    Camera: {
      // iOS özel izin mesajları
      iOSPhotoLibraryAddPermissionMessage: 'Bu uygulama fotoğraf çekmek için galeriye erişim istiyor.',
      iOSPhotoLibraryUsageDescription: 'Bu uygulama fotoğraf çekmek için galeriye erişim istiyor.'
    },
    // Push bildirimleri için (gerekirse)
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;