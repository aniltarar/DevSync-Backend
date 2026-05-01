# DevSync — Veritabanı İlişkileri

DevSync, geliştiricilerin proje oluşturup ekip bulduğu, sosyal etkileşim kurduğu ve gerçek zamanlı iletişim sağladığı bir platformdur.

---

## Model Listesi

| Model | Açıklama |
|---|---|
| `User` | Platform kullanıcısı |
| `Token` | Refresh token yönetimi |
| `Project` | Geliştirici projeleri |
| `Application` | Projeye başvurular |
| `Post` | Kullanıcı paylaşımları |
| `Comment` | Gönderi yorumları |
| `Conversation` | Mesajlaşma oturumları |
| `Message` | Bireysel mesajlar |
| `Notification` | Sistem bildirimleri |
| `Report` | Kullanıcı şikayetleri |

---

## İlişki Diyagramı

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                  USER                                     │
│  username · email · password · role · profile{} · skills[] · titles[]     │
│  socialLinks{} · onlineStatus · lastSeenAt · isEmailVerified              │
│  blockedUsers[] · following[] · followers[]                                │
└──────┬──────────────────────────────────────────────────────────────────┬─┘
       │ 1                                                                │ 1
       │                                                                  │
  owns │                                                        creates   │
       │                                                                  │
       ▼ N                                                                ▼ N
┌──────────────────┐                                       ┌──────────────────┐
│     PROJECT      │                                       │       POST       │
│  title           │                                       │  content         │
│  description     │                                       │  tags[]          │
│  category        │                                       │  images[]{url,   │
│  projectType     │                                       │    originalName} │
│  status          │                                       │  likes[]─────────┼──→ User[]
│  slots[]         │                                       │  commentsCount   │
└──────┬───────────┘                                       └──────┬──────────┘
       │ 1                                                        │ 1
       │                                                          │
apply  │                                                comments  │
       │                                                          │
       ▼ N                                                        ▼ N
┌──────────────────┐                                    ┌──────────────────────┐
│   APPLICATION    │                                    │       COMMENT        │
│  userId──────────┼──→ User                            │  authorId────────────┼──→ User
│  projectId───────┼──→ Project                         │  postId──────────────┼──→ Post
│  slotId          │                                    │  parentCommentId─────┼──→ Comment (iç içe)
│  roleName        │                                    │  likes[]─────────────┼──→ User[]
│  status          │                                    └──────────────────────┘
│  message         │
└──────────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│                            CONVERSATION                                  │
│  participants[]──────────────────────────────────────────────→ User[]    │
│  projectId (opsiyonel)───────────────────────────────────────→ Project   │
│  conversationType: direct | group | project                              │
│  title · adminId → User · lastMessage{} · isActive                       │
└──────┬───────────────────────────────────────────────────────────────────┘
       │ 1
       │
       ▼ N
┌──────────────────┐
│     MESSAGE      │
│  senderId────────┼──→ User
│  conversationId──┼──→ Conversation
│  content         │
│  messageType     │
│  fileData{}      │
│  isEdited        │
│  editedAt        │
│  isDeleted       │
│  deletedAt       │
│  readBy[]{userId,┼──→ User, readAt}
└──────────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│                           NOTIFICATION                                   │
│  recipientId─────────────────────────────────────────────────→ User      │
│  senderId (opsiyonel)────────────────────────────────────────→ User      │
│  type: like_post | like_comment | comment | reply | follow |             │
│        new_application | application_update | project_invite | message   │
│  referenceId + referenceModel ───────────────────────→ (Polymorphic)     │
│    referenceModel: Post | Comment | Application | Project | User |       │
│                    Conversation                                           │
│  isRead · readAt                                                         │
└──────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│                             REPORT                                       │
│  reporterId──────────────────────────────────────────────────→ User      │
│  reportType: post | comment | project | user | chat | application | other│
│  contentId (type'a göre değişen ID)                                      │
│  reason: spam | abuse | harassment | inappropriate content | other        │
│  description                                                             │
│  status{isResolved, state, resolvedAt, resolvedBy → User, actionTaken,   │
│         adminNote}                                                        │
└──────────────────────────────────────────────────────────────────────────┘


┌──────────────────┐
│      TOKEN       │
│  userId──────────┼──→ User
│  refreshToken    │
└──────────────────┘
```

---

## Model Detayları

### User
Platformun merkezi modelidir. Diğer tüm modeller doğrudan ya da dolaylı olarak User'a referans verir.

- `profile{name, surname, bio, avatarUrl, location}` — kullanıcı profil bilgileri
- `socialLinks{github, linkedin, portfolio}` — sosyal bağlantılar
- `skills[]` — kullanıcı becerileri
- `titles[]` — kullanıcı ünvanları (max 10)
- `blockedUsers[]` → `User[]` — engelleme sistemi
- `following[]` → `User[]` — takip sistemi
- `followers[]` → `User[]` — takipçi listesi
- `role: user | admin` — admin rolü Report çözme işlemleri için kullanılır
- `onlineStatus: online | offline | away` — anlık durum
- `lastSeenAt` — son görülme zamanı
- `isEmailVerified` — e-posta doğrulama durumu
- `emailVerificationToken` + `emailVerificationExpires` — doğrulama token'ı ve süresi
- `status` — hesap aktiflik durumu (Boolean)

---

### Project
Proje sahibi `ownerId` üzerinden User'a bağlanır. Projeler içinde `slots[]` adlı gömülü belgeler bulunur.

- `title` — proje başlığı
- `description` — proje açıklaması (20-500 karakter)
- `projectType: personal | team | open-source | freelance`
- `category: web | mobile | desktop | ai | game | devops | other`
- `status: draft | pending | active | closed | rejected`
- `slots[].roleName` — pozisyon adı
- `slots[].requiredSkills[]` + `slots[].optionalSkills[]` — beceri gereksinimleri
- `slots[].quota` — kapasite
- `slots[].status: open | filled` — slot dolunca otomatik güncellenir
- `slots[].filledBy[]` → `User[]` — kabul edilen başvurular bu alana yazılır

---

### Application
Bir kullanıcının belirli bir projedeki belirli bir slota başvurusunu temsil eder.

- `projectId` → `Project`
- `userId` → `User`
- `slotId` — `Project.slots[]` içindeki gömülü belgenin `_id`'si
- `roleName` — başvurulan pozisyon adı
- `message` — başvuru mesajı
- `status: pending | accepted | rejected | cancelled`
- `appliedAt` — başvuru zamanı
- `respondedAt` — yanıt zamanı

---

### Post & Comment
Post, kullanıcı paylaşımlarını; Comment ise bu paylaşımlara ait yorumları tutar.

- `Post.images[]` — subdocument: `{url, originalName}`
- `Post.engagement.likes[]` → `User[]` — toggle beğeni sistemi
- `Post.engagement.commentsCount` — Comment oluşturulup silindiğinde otomatik güncellenen sayaç
- `Comment.parentCommentId` → `Comment` — kendi kendine referans, iç içe (nested reply) yapısı
- `Comment.likes[]` → `User[]` — yorum beğeni sistemi

---

### Conversation & Message
Gerçek zamanlı mesajlaşma altyapısını oluşturur.

- `Conversation.conversationType: direct | group | project`
  - `project` tipindeyse `projectId` → `Project` zorunlu
- `Conversation.adminId` → `User` — grup yöneticisi
- `Conversation.lastMessage{}` gömülü belge (content, senderId, timestamp) — sohbet listelerinde ayrı sorgu gerektirmez
- `Conversation.isActive` — konuşma aktiflik durumu
- `Message.messageType: text | image | file | notification`
- `Message.fileData{fileName, fileUrl, fileType, fileSize}` — dosya ek bilgileri
- `Message.isEdited` + `editedAt` — düzenleme takibi
- `Message.isDeleted` + `deletedAt` — soft delete, fiziksel silme yapılmaz
- `Message.readBy[]{userId, readAt}` — kullanıcı bazlı okundu bilgisi (subdocument)

---

### Notification
Polimorfik referans kullanan tek modeldir.

- `type: like_post | like_comment | comment | reply | follow | new_application | application_update | project_invite | message`
- `referenceModel: Post | Comment | Application | Project | User | Conversation`
- `isRead` + `readAt` — okundu durumu takibi

```
referenceId + referenceModel → hangi içeriğin bildirimini tetiklediği

Örnek:
  type: "like_post"
  referenceId: <postId>
  referenceModel: "Post"

  type: "new_application"
  referenceId: <applicationId>
  referenceModel: "Application"

  type: "message"
  referenceId: <conversationId>
  referenceModel: "Conversation"
```

`senderId: null` — sistem tarafından üretilen bildirimlerde gönderen olmaz.

---

### Report
İçerik şikayetlerini yönetir. Admin paneli üzerinden çözümlenir.

- `reportType: post | comment | project | user | chat | application | other`
- `contentId` — reportType'a göre ilgili içeriğin ID'si
- `reason: spam | abuse | harassment | inappropriate content | other`
- `description` — şikayet detayı
- `status.isResolved` — çözüm durumu
- `status.state: pending | resolved | rejected | cancelled`
- `status.resolvedAt` — çözüm zamanı
- `status.resolvedBy` → `User` (admin)
- `status.actionTaken: none | warning | suspension | ban | content removal`
- `status.adminNote` — admin notu

---

### Token
JWT refresh token'larını veritabanında saklar. Logout işleminde token silinir, token yenileme sırasında doğrulanır.

---

## Tetikleyici İlişkiler (Cascading Logic)

| Eylem | Tetiklenen Güncelleme |
|---|---|
| Post beğenildi | `Post.engagement.likes[]` güncellenir + `like_post` Notification oluşur |
| Yorum beğenildi | `Comment.likes[]` güncellenir + `like_comment` Notification oluşur |
| Yorum oluşturuldu | `Post.engagement.commentsCount` +1 + `comment` Notification oluşur |
| Yoruma yanıt verildi | `reply` Notification oluşur |
| Kullanıcı takip edildi | `following[]` ve `followers[]` güncellenir + `follow` Notification oluşur |
| Projeye başvuruldu | Application oluşur + `new_application` Notification oluşur |
| Başvuru kabul edildi | `Application.status = accepted` + `Project.slots[].filledBy[]` güncellenir + `application_update` Notification oluşur |
| Projeye davet edildi | `project_invite` Notification oluşur |
| Mesaj gönderildi | `Conversation.lastMessage` güncellenir + `message` Notification oluşur |
| Kullanıcı çevrimiçi | `User.onlineStatus = online` + `User.lastSeenAt` güncellenir |
| Kullanıcı çevrimdışı | `User.onlineStatus = offline` + `User.lastSeenAt` güncellenir |
