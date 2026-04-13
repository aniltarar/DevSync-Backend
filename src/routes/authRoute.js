const express = require("express");
const router = express.Router();
const {
  register,
  login,
  tokenRefresh,
  logout,
  uploadAvatar,
  updateProfile,
  getProfile,
  blockUser,
  deleteAvatar,
  followUser,
  getFollowing,
  getFollowers,
  searchUsers,
} = require("@/controllers/authController");
const { verifyAccessToken } = require("@/middlewares/authMiddleware");
const {
  uploadAvatar: uploadAvatarMiddleware,
  handleMulterError,
} = require("@/config/multerConfig");
const { authLimiter, registerLimiter } = require("@/middlewares/rateLimiter");

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Yeni kullanıcı kayıt
 *     description: Email ve username ile yeni kullanıcı oluştur
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - name
 *               - surname
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               name:
 *                 type: string
 *                 example: John
 *               surname:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla kayıt oldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 profile:
 *                   type: object
 *       400:
 *         description: Gerekli alanlar eksik
 *       409:
 *         description: Kullanıcı adı veya email zaten kayıtlı
 *       500:
 *         description: Sunucu hatası
 */
router.post("/register", registerLimiter, register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Kullanıcı giriş
 *     description: Email ve parola ile giriş yap
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Başarıyla giriş yapıldı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *       400:
 *         description: Email ve parola alanları zorunludur
 *       401:
 *         description: Email veya parola yanlış
 *       404:
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post("/login", authLimiter, login);

/**
 * @swagger
 * /auth/token-refresh:
 *   post:
 *     summary: Token yenileme
 *     description: Refresh token kullanarak yeni access token al
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Cookie'de yoksa body'de gönder
 *     responses:
 *       200:
 *         description: Token başarıyla yenilendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Refresh token bulunamadı
 *       403:
 *         description: Geçersiz refresh token
 *       404:
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post("/token-refresh", authLimiter, tokenRefresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Kullanıcı çıkış
 *     description: Refresh token'ı sil ve çıkış yap
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Cookie'de yoksa body'de gönder
 *     responses:
 *       200:
 *         description: Başarıyla çıkış yapıldı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Refresh token gereklidir
 *       500:
 *         description: Sunucu hatası
 */
router.post("/logout", logout);

/**
 * @swagger
 * /auth/avatar:
 *   post:
 *     summary: Profil fotoğrafı yükle
 *     description: Kullanıcının profil fotoğrafını yükler veya günceller. Maksimum 5MB, JPEG/PNG/GIF/WebP.
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Yüklenecek profil fotoğrafı (JPEG/PNG/GIF/WebP, max 5MB)
 *     responses:
 *       200:
 *         description: Profil fotoğrafı başarıyla yüklendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profil fotoğrafı başarıyla yüklendi.
 *                 avatarUrl:
 *                   type: string
 *                   example: /uploads/images/avatar-1740700000000-123456789.jpg
 *                 profile:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     surname:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *                     location:
 *                       type: string
 *       400:
 *         description: Dosya yüklenmedi veya geçersiz format
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post(
  "/avatar",
  verifyAccessToken,
  uploadAvatarMiddleware,
  handleMulterError,
  uploadAvatar,
);

/**
 * @swagger
 * /auth/avatar:
 *   delete:
 *     summary: Profil fotoğrafını sil
 *     description: Kullanıcının profil fotoğrafını siler
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profil fotoğrafı başarıyla silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profil fotoğrafı başarıyla silindi.
 *                 profile:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     surname:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *                     location:
 *                       type: string
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.delete("/avatar", verifyAccessToken, deleteAvatar);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Profil güncelle
 *     description: Kullanıcının profil bilgilerini günceller (avatar hariç)
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               name:
 *                 type: string
 *                 example: John
 *               surname:
 *                 type: string
 *                 example: Doe
 *               bio:
 *                 type: string
 *                 example: Full-stack developer
 *               location:
 *                 type: string
 *                 example: Istanbul, Turkey
 *               socialLinks:
 *                 type: object
 *                 properties:
 *                   github:
 *                     type: string
 *                   linkedin:
 *                     type: string
 *                   portfolio:
 *                     type: string
 *               titles:
 *                 type: array
 *                 items:
 *                   type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Profil başarıyla güncellendi
 *       400:
 *         description: Güncellenecek alan bulunamadı veya geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       409:
 *         description: Kullanıcı adı zaten kullanılıyor
 *       500:
 *         description: Sunucu hatası
 */
router.put("/profile", verifyAccessToken, updateProfile);

/**
 * @swagger
 * /auth/profile/{id}:
 *   get:
 *     summary: Kullanıcı profili getir
 *     description: Verilen ID'ye sahip kullanıcının profil bilgilerini döner
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Kullanıcı ID'si
 *     responses:
 *       200:
 *         description: Profil başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     profile:
 *                       type: object
 *                     role:
 *                       type: string
 *                     socialLinks:
 *                       type: object
 *                     skills:
 *                       type: array
 *                       items:
 *                         type: string
 *                     titles:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get("/profile/:id", verifyAccessToken, getProfile);

/**
 * @swagger
 * /auth/block/{userId}:
 *   post:
 *     summary: Kullanıcı engelle / engel kaldır
 *     description: Verilen ID'li kullanıcıyı engeller. Zaten engelliyse engeli kaldırır (toggle).
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Engellenecek kullanıcının ID'si
 *     responses:
 *       200:
 *         description: Kullanıcı engellendi veya engeli kaldırıldı
 *       400:
 *         description: Kendinizi engelleyemezsiniz
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post("/block/:userId", verifyAccessToken, blockUser);

/**
 * @swagger
 * /auth/follow/{userId}:
 *   post:
 *     summary: Kullanıcı takip et / takibi bırak
 *     description: Verilen ID'li kullanıcıyı takip eder. Zaten takip ediliyorsa takibi bırakır (toggle).
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Takip edildi veya takipten çıkıldı
 *       400:
 *         description: Kendinizi takip edemezsiniz
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.post("/follow/:userId", verifyAccessToken, followUser);

/**
 * @swagger
 * /auth/following:
 *   get:
 *     summary: Takip ettiklerimi getir
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Takip listesi
 */
router.get("/following", verifyAccessToken, getFollowing);

/**
 * @swagger
 * /auth/followers:
 *   get:
 *     summary: Takipçilerimi getir
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Takipçi listesi
 */
router.get("/followers", verifyAccessToken, getFollowers);

/**
 * @swagger
 * /auth/users/search:
 *   get:
 *     summary: Kullanıcı ara
 *     description: Username, isim veya soyisim ile kullanıcı ara. Min 2 karakter.
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Arama terimi (min 2 karakter)
 *     responses:
 *       200:
 *         description: Kullanıcı listesi (isFollowing ve isBlocked bilgisiyle)
 *       400:
 *         description: Arama terimi çok kısa
 */
router.get("/users/search", verifyAccessToken, searchUsers);

module.exports = router;
