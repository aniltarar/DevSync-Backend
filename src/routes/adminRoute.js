const express = require("express");
const router = express.Router();

const {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getAllPosts,
  deletePost,
  getAllProjects,
  updateProjectStatus,
  getAllComments,
  deleteComment,
} = require("@/controllers/adminController.js");
const { verifyAccessToken } = require("@/middlewares/authMiddleware");
const { checkRole } = require("@/middlewares/checkRole");

// Tüm admin route'ları için auth + admin kontrolü
router.use(verifyAccessToken, checkRole("admin"));

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Dashboard istatistikleri
 *     description: Toplam kullanıcı, gönderi, proje, yorum, bekleyen rapor sayıları ile son kullanıcılar ve raporları getirir
 *     tags:
 *       - Admin
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: İstatistikler başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                     totalPosts:
 *                       type: integer
 *                     totalProjects:
 *                       type: integer
 *                     totalComments:
 *                       type: integer
 *                     pendingReports:
 *                       type: integer
 *                 recentUsers:
 *                   type: array
 *                   items:
 *                     type: object
 *                 recentReports:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim (admin değil)
 *       500:
 *         description: Sunucu hatası
 */
router.get("/stats", getDashboardStats);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Tüm kullanıcıları listele
 *     description: Sayfalama, arama, rol ve durum filtresi ile kullanıcıları getirir
 *     tags:
 *       - Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Sayfa başına kayıt sayısı
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Username, email, isim veya soyisim ile arama
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Rol filtresi
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Durum filtresi (aktif/ban)
 *     responses:
 *       200:
 *         description: Kullanıcılar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalUsers:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim
 *       500:
 *         description: Sunucu hatası
 */
router.get("/users", getAllUsers);

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Kullanıcı detayı getir
 *     description: Belirtilen kullanıcının detay bilgileri ve istatistiklerini getirir
 *     tags:
 *       - Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Kullanıcı ID'si
 *     responses:
 *       200:
 *         description: Kullanıcı detayı başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     postCount:
 *                       type: integer
 *                     projectCount:
 *                       type: integer
 *                     commentCount:
 *                       type: integer
 *                     reportCount:
 *                       type: integer
 *       400:
 *         description: Geçersiz kullanıcı ID'si
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get("/users/:userId", getUserById);

/**
 * @swagger
 * /admin/users/{userId}/status:
 *   patch:
 *     summary: Kullanıcı durumunu değiştir (Ban/Unban)
 *     description: Kullanıcıyı aktif eder veya banlar
 *     tags:
 *       - Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Kullanıcı ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: boolean
 *                 description: true = aktif, false = ban
 *                 example: false
 *     responses:
 *       200:
 *         description: Kullanıcı durumu güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     status:
 *                       type: boolean
 *       400:
 *         description: Geçersiz ID veya kendi hesabını değiştirme girişimi
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.patch("/users/:userId/status", updateUserStatus);

/**
 * @swagger
 * /admin/users/{userId}/role:
 *   patch:
 *     summary: Kullanıcı rolünü değiştir
 *     description: Kullanıcının rolünü user veya admin olarak günceller
 *     tags:
 *       - Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Kullanıcı ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: admin
 *     responses:
 *       200:
 *         description: Kullanıcı rolü güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Geçersiz ID, kendi rolünü değiştirme girişimi veya geçersiz rol
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.patch("/users/:userId/role", updateUserRole);

/**
 * @swagger
 * /admin/posts:
 *   get:
 *     summary: Tüm gönderileri listele
 *     description: Sayfalama ve arama ile tüm gönderileri getirir
 *     tags:
 *       - Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Sayfa başına kayıt sayısı
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Gönderi içeriğinde arama
 *     responses:
 *       200:
 *         description: Gönderiler başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPosts:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim
 *       500:
 *         description: Sunucu hatası
 */
router.get("/posts", getAllPosts);

/**
 * @swagger
 * /admin/posts/{postId}:
 *   delete:
 *     summary: Gönderi sil
 *     description: Belirtilen gönderiyi ve ilişkili yorumlarını siler
 *     tags:
 *       - Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Gönderi ID'si
 *     responses:
 *       200:
 *         description: Gönderi ve yorumları silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Gönderi ve yorumları silindi.
 *       400:
 *         description: Geçersiz gönderi ID'si
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Gönderi bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete("/posts/:postId", deletePost);

/**
 * @swagger
 * /admin/projects:
 *   get:
 *     summary: Tüm projeleri listele
 *     description: Sayfalama, durum, kategori ve arama filtresi ile projeleri getirir
 *     tags:
 *       - Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Sayfa başına kayıt sayısı
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, active, closed, rejected]
 *         description: Proje durum filtresi
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Kategori filtresi
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Proje başlığında arama
 *     responses:
 *       200:
 *         description: Projeler başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalProjects:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim
 *       500:
 *         description: Sunucu hatası
 */
router.get("/projects", getAllProjects);

/**
 * @swagger
 * /admin/projects/{projectId}/status:
 *   patch:
 *     summary: Proje durumunu güncelle
 *     description: Projenin durumunu günceller (draft, pending, active, closed, rejected)
 *     tags:
 *       - Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Proje ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, pending, active, closed, rejected]
 *                 example: active
 *     responses:
 *       200:
 *         description: Proje durumu güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 project:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Geçersiz proje ID'si veya geçersiz durum
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Proje bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.patch("/projects/:projectId/status", updateProjectStatus);

/**
 * @swagger
 * /admin/comments:
 *   get:
 *     summary: Tüm yorumları listele
 *     description: Sayfalama ve arama ile tüm yorumları getirir
 *     tags:
 *       - Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Sayfa başına kayıt sayısı
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Yorum içeriğinde arama
 *     responses:
 *       200:
 *         description: Yorumlar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalComments:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim
 *       500:
 *         description: Sunucu hatası
 */
router.get("/comments", getAllComments);

/**
 * @swagger
 * /admin/comments/{commentId}:
 *   delete:
 *     summary: Yorum sil
 *     description: Belirtilen yorumu ve alt yorumlarını siler, ilgili gönderinin yorum sayısını günceller
 *     tags:
 *       - Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Yorum ID'si
 *     responses:
 *       200:
 *         description: Yorum ve alt yorumları silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Yorum ve alt yorumları silindi.
 *       400:
 *         description: Geçersiz yorum ID'si
 *       401:
 *         description: Yetkilendirme hatası
 *       403:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Yorum bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete("/comments/:commentId", deleteComment);

module.exports = router;
