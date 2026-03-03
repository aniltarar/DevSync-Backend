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
┌─────────────────────────────────────────────────────────────────┐
│                             USER                                │
│  username · email · password · role · skills · onlineStatus     │
└──────┬────────────────────────────────────────────────────────┬─┘
       │ 1                                                      │ 1
       │                                                        │
  owns │                                              creates   │
       │                                                        │
       ▼ N                                                      ▼ N
┌─────────────┐                                       ┌──────────────┐
│   PROJECT   │                                       │     POST     │
│  title      │                                       │  content     │
│  category   │                                       │  tags        │
│  status     │                                       │  images[]    │
│  slots[]    │                                       │  likes[]─────┼──→ User[]
└──────┬──────┘                                       └──────┬───────┘
       │ 1                                                   │ 1
       │                                                     │
apply  │                                           comments  │
       │                                                     │
       ▼ N                                                   ▼ N
┌─────────────┐                                    ┌──────────────────┐
│ APPLICATION │                                    │     COMMENT      │
│  userId─────┼──→ User                            │  authorId────────┼──→ User
│  slotId     │                                    │  postId──────────┼──→ Post
│  status     │                                    │  parentCommentId─┼──→ Comment (iç içe)
│  message    │                                    │  likes[]─────────┼──→ User[]
└─────────────┘                                    └──────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                         CONVERSATION                             │
│  participants[]─────────────────────────────────────────→ User[] │
│  projectId (opsiyonel)──────────────────────────────────→ Project│
│  conversationType: direct | group | project                      │
└──────┬───────────────────────────────────────────────────────────┘
       │ 1
       │
       ▼ N
┌─────────────┐
│   MESSAGE   │
│  senderId───┼──→ User
│  content    │
│  messageType│
│  fileData{} │
│  readBy[]───┼──→ User[]
│  isDeleted  │
└─────────────┘


┌────────────────────────────────────────────────────────────────┐
│                        NOTIFICATION                            │
│  recipientId──────────────────────────────────────────→ User   │
│  senderId (opsiyonel, sistem bildirimi olabilir)───────→ User   │
│  type: like_post | comment | reply | follow | ...             │
│  referenceId + referenceModel ─────────────────────→ (Polymorphic)│
│    referenceModel: Post | Comment | Application | Project | ... │
└────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────┐
│                           REPORT                               │
│  reporterId────────────────────────────────────────────→ User  │
│  reportType: post | comment | user | project | ...            │
│  contentId (type'a göre değişen ID)                            │
│  status.resolvedBy (opsiyonel)─────────────────────────→ User  │
└────────────────────────────────────────────────────────────────┘


┌─────────────┐
│    TOKEN    │
│  userId─────┼──→ User
│  refreshToken│
└─────────────┘
```

---

## Model Detayları

### User
Platformun merkezi modelidir. Diğer tüm modeller doğrudan ya da dolaylı olarak User'a referans verir.

- `blockedUsers[]` → `User[]` — kendi kendine referans, engelleme sistemi
- `role: user | admin` — admin rolü Report çözme işlemleri için kullanılır

---

### Project
Proje sahibi `ownerId` üzerinden User'a bağlanır. Projeler içinde `slots[]` adlı gömülü belgeler bulunur.

- `slots[].filledBy[]` → `User[]` — kabul edilen başvurular bu alana yazılır
- `slots[].status: open | filled` — slot dolunca otomatik güncellenir
- Application kabul edildiğinde hem `Application.status` güncellenir hem de ilgili slot'un `filledBy` dizisine kullanıcı eklenir

---

### Application
Bir kullanıcının belirli bir projedeki belirli bir slota başvurusunu temsil eder.

- `projectId` → `Project`
- `userId` → `User`
- `slotId` — `Project.slots[]` içindeki gömülü belgenin `_id`'si
- `status: pending | accepted | rejected | cancelled`

---

### Post & Comment
Post, kullanıcı paylaşımlarını; Comment ise bu paylaşımlara ait yorumları tutar.

- `Comment.parentCommentId` → `Comment` — kendi kendine referans, yorumların iç içe (nested reply) yapısını sağlar
- `Post.engagement.commentsCount` — Comment oluşturulup silindiğinde otomatik güncellenen sayaç
- Her iki modelde de `likes[]` → `User[]` toggle beğeni sistemi

---

### Conversation & Message
Gerçek zamanlı mesajlaşma altyapısını oluşturur.

- `Conversation.conversationType: direct | group | project`
  - `project` tipindeyse `projectId` → `Project` zorunlu
- `Conversation.lastMessage` gömülü belge, sohbet listelerinde ayrı sorgu gerektirmez
- `Message.isDeleted` — soft delete, fiziksel silme yapılmaz
- `Message.readBy[]` → `User[]` okundu bilgisi

---

### Notification
Polimorfik referans kullanan tek modeldir.

```
referenceId + referenceModel → hangi içeriğin bildirimini tetiklediği

Örnek:
  type: "like_post"
  referenceId: <postId>
  referenceModel: "Post"

  type: "application_update"
  referenceId: <applicationId>
  referenceModel: "Application"
```

`senderId: null` — sistem tarafından üretilen bildirimlerde gönderen olmaz.

---

### Report
İçerik şikayetlerini yönetir. Admin paneli üzerinden çözümlenir.

- `reportType` hangi içerik türünün şikayet edildiğini belirtir
- `contentId` — reportType'a göre Post, Comment, User, Project vb. ID'si
- `status.resolvedBy` → `User` (admin)
- `status.actionTaken: none | warning | suspension | ban | content removal`

---

### Token
JWT refresh token'larını veritabanında saklar. Logout işleminde token silinir, token yenileme sırasında doğrulanır.

---

## Tetikleyici İlişkiler (Cascading Logic)

| Eylem | Tetiklenen Güncelleme |
|---|---|
| Post beğenildi | `Post.engagement.likes[]` güncellenir + `like_post` Notification oluşur |
| Yorum oluşturuldu | `Post.engagement.commentsCount` +1 + `comment` Notification oluşur |
| Yoruma yanıt verildi | `reply` Notification oluşur |
| Başvuru kabul edildi | `Application.status = accepted` + `Project.slots[].filledBy[]` güncellenir + `application_update` Notification oluşur |
| Mesaj gönderildi | `Conversation.lastMessage` güncellenir + `message` Notification oluşur |
| Kullanıcı çevrimiçi | `User.onlineStatus = online` + `User.lastSeenAt` güncellenir |
