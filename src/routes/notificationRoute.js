const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("@/middlewares/authMiddleware");
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("@/controllers/notificationController");

router.use(verifyAccessToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 6574337cf052d49b0afb45ab
 *         recipientId:
 *           type: string
 *           example: 6574337cf052d49b0afb45ab
 *         senderId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             username:
 *               type: string
 *               example: johndoe
 *             profile:
 *               type: object
 *               properties:
 *                 avatarUrl:
 *                   type: string
 *                   example: /uploads/images/avatar.jpg
 *         type:
 *           type: string
 *           enum: [like_post, like_comment, comment, reply, follow, new_application, application_update, project_invite, message]
 *           description: |
 *             Bildirim tipi:
 *             - `new_application`: Proje sahibine — yeni başvuru alındı
 *             - `application_update`: Başvurucuya — başvurusu kabul/reddedildi
 *           example: like_post
 *         referenceId:
 *           type: string
 *           example: 6574337cf052d49b0afb45ab
 *         referenceModel:
 *           type: string
 *           enum: [Post, Comment, Application, Project, User, Conversation]
 *           example: Post
 *         isRead:
 *           type: boolean
 *           example: false
 *         readAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Bildirimleri listele
 *     description: "Oturum açmış kullanıcının bildirimlerini getirir. Sayfalama ve okunmamış filtresi desteklenir."
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *         example: 1
 *         description: Sayfa numarası (1 tabanlı)
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *         example: 20
 *         description: Sayfa başına kayıt sayısı
 *       - name: unreadOnly
 *         in: query
 *         schema:
 *           type: boolean
 *         example: false
 *         description: "true gönderilirse sadece okunmamış bildirimler listelenir"
 *     responses:
 *       200:
 *         description: Bildirimler başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 42
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Kimlik doğrulama gerekli
 *       500:
 *         description: Sunucu hatası
 */
router.get("/", getNotifications);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Okunmamış bildirim sayısını getir
 *     description: Oturum açmış kullanıcının okunmamış bildirim sayısını döner.
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Okunmamış sayısı başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Kimlik doğrulama gerekli
 *       500:
 *         description: Sunucu hatası
 */
router.get("/unread-count", getUnreadCount);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Tüm bildirimleri okundu işaretle
 *     description: Oturum açmış kullanıcının tüm okunmamış bildirimlerini okundu olarak işaretler.
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tüm bildirimler okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tüm bildirimler okundu olarak işaretlendi.
 *                 updatedCount:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Kimlik doğrulama gerekli
 *       500:
 *         description: Sunucu hatası
 */
router.patch("/read-all", markAllAsRead);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Tek bildirimi okundu işaretle
 *     description: Belirtilen bildirimi okundu olarak işaretler. Bildirim oturum açmış kullanıcıya ait olmalıdır.
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *         description: Bildirim ID'si (Mongo ObjectId)
 *     responses:
 *       200:
 *         description: Bildirim okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Bildirim okundu olarak işaretlendi.
 *                 notification:
 *                   $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Kimlik doğrulama gerekli
 *       404:
 *         description: Bildirim bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.patch("/:id/read", markAsRead);

module.exports = router;
