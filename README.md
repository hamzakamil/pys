# Personel Yönetim Sistemi

Bu proje, süper admin, bayi ve şirket yönetimi için geliştirilmiş bir personel yönetim sistemidir.

## Proje Yapısı

- `backend/` - Node.js backend API
- `ui/` - Vue.js frontend uygulaması

## Kurulum

### Gereksinimler

- Node.js (v16 veya üzeri)
- pnpm (kurulum için: `npm install -g pnpm`)

### Backend

```bash
cd backend
pnpm install
cp .env.example .env
# .env dosyasını düzenleyin
pnpm run dev
```

Backend varsayılan olarak `http://localhost:3000` portunda çalışır.

### Frontend

```bash
cd ui
pnpm install
pnpm run dev
```

Frontend varsayılan olarak `http://localhost:5173` portunda çalışır.

## İlk Kurulum

Backend'i ilk kez çalıştırdığınızda, roller ve super admin kullanıcısını oluşturmak için:

```bash
cd backend
node scripts/initRoles.js
```

Varsayılan super admin bilgileri:
- Email: `admin@admin.com`
- Şifre: `admin123`

## Özellikler

- Süper Admin: Bayi hesapları oluşturur ve tüm sistemi görüntüler
- Bayi Admin: Şirket hesapları oluşturur
- Şirket Admin: Departman ve çalışan yönetimi yapar
- Çalışan izin türleri yönetimi (varsayılan + şirket özel)
- Departman yönetimi
- Çalışma saatleri yönetimi
- Excel'den toplu çalışan ekleme
- Şirket ayarları (logo ve başlık)
- Çalışan kullancı adı ile giriş yapıp izin talebi oluşturarak şirket admini yada tanımlanmış yöneticisine onaya gönderir.

## Teknolojiler

- Backend: Node.js, Express, MongoDB, Mongoose
- Frontend: Vue.js 3, Pinia, Vue Router, Tailwind CSS
- Diğer: Axios, Multer, XLSX

