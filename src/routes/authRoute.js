const express = require('express');
const router = express.Router();
const { register, login, tokenRefresh, logout, uploadAvatar } = require('@/controllers/authController');
const { verifyAccessToken } = require('@/middlewares/authMiddleware');
const { uploadAvatar: uploadAvatarMiddleware, handleMulterError } = require('@/config/multerConfig');

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
router.post('/register', register);

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
router.post('/login', login);

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
router.post('/token-refresh', tokenRefresh);

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
router.post('/logout', logout);

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
router.post('/avatar', verifyAccessToken, uploadAvatarMiddleware, handleMulterError, uploadAvatar);

module.exports = router;