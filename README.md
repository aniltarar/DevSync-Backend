# DevSync — Backend

Geliştiricileri bir araya getiren, proje bazlı işbirliği ve gerçek zamanlı iletişim sunan bir platform.

## Teknolojiler

| Kategori | Teknoloji |
|----------|-----------|
| Runtime | Node.js |
| Framework | Express.js v5 |
| Veritabanı | MongoDB + Mongoose ODM |
| Gerçek Zamanlı | Socket.io |
| Kimlik Doğrulama | JWT (Access + Refresh Token), bcrypt |
| Dosya Yükleme | Multer |
| API Dokümantasyonu | Swagger (OpenAPI 3.0) |

## Mimari

- **MVC + Service Layer** — Controller, Model, Route ve Service katmanlarıyla sorumluluk ayrımı
- **JWT Dual Token** — Access & Refresh token rotasyonu, cookie tabanlı güvenli oturum yönetimi
- **RBAC** — `checkRole()` middleware ile rol bazlı yetkilendirme (user/admin)
- **Socket.io Event-Driven** — Chat ve bildirim handler'ları modüler yapıda, bağlantı bazlı JWT doğrulama
- **Polimorfik Bildirimler** — Tek model üzerinden çoklu bildirim tipi (like, comment, reply, application vb.)

## Öne Çıkan Özellikler

- **Proje Yönetimi** — Slot bazlı takım oluşturma, başvuru ve onay sistemi
- **Gerçek Zamanlı Mesajlaşma** — Direkt ve grup sohbetleri, proje bazlı konuşmalar
- **Sosyal Etkileşim** — Post paylaşımı, iç içe yorum sistemi, beğeni mekanizması
- **Canlı Bildirimler** — Socket üzerinden anlık bildirim iletimi
- **Kullanıcı Presence** — Online/offline durum takibi ve yayını
- **Raporlama** — İçerik ve kullanıcı raporlama, admin çözüm paneli
- **Dosya Yönetimi** — Avatar, post görselleri ve sohbet dosyaları için ayrı depolama

## Proje Yapısı

```
src/
├── config/          # DB, Multer, Swagger yapılandırmaları
├── controllers/     # İş mantığı (8 controller)
├── middlewares/      # Auth, RBAC, Socket auth
├── models/          # Mongoose şemaları (10 model)
├── routes/          # REST API endpoint'leri
├── services/        # Chat & Notification servisleri
├── socket/          # Socket.io sunucusu ve handler'lar
└── server.js
```

## Kurulum

```bash
npm install
npm run dev     # Geliştirme (nodemon)
npm start       # Prodüksiyon
```

API dokümantasyonuna `http://localhost:{PORT}/api-docs` adresinden ulaşılabilir.
