const express = require("express");
const router = express.Router();

const {
  createReport,
  getMyReports,
  cancelReport,
  getReportById,
  getAllReports,
  resolveReport,
} = require("@/controllers/reportController.js");
const { verifyAccessToken } = require("@/middlewares/authMiddleware");
const { checkRole } = require("@/middlewares/checkRole");

/**
 * @swagger
 * /reports:
 *   post:
 *     summary: Yeni rapor oluştur
 *     tags:
 *       - Reports
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportType
 *               - reason
 *             properties:
 *               reportType:
 *                 type: string
 *                 enum: [post, comment, project, user, chat, application, other]
 *                 example: post
 *                 description: Raporlanan içerik türü
 *               contentId:
 *                 type: string
 *                 example: 6574337cf052d49b0afb45ab
 *                 description: Raporlanan içeriğin ID'si (other ve chat hariç gerekli)
 *               reason:
 *                 type: string
 *                 enum: [spam, abuse, harassment, inappropriate content, other]
 *                 example: spam
 *                 description: Rapor nedeni
 *               description:
 *                 type: string
 *                 example: Bu gönderi spam içeridir
 *                 description: Rapor açıklaması (opsiyonel, max 1000 karakter)
 *     responses:
 *       201:
 *         description: Rapor başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz istek
 *       409:
 *         description: Zaten bu içeriği rapor ettiniz
 *       500:
 *         description: Sunucu hatası
 */
router.post("/", verifyAccessToken, createReport);

/**
 * @swagger
 * /reports/my-reports:
 *   get:
 *     summary: Kendi raporlarımı getir
 *     tags:
 *       - Reports
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *       - name: reportType
 *         in: query
 *         schema:
 *           type: string
 *           enum: [post, comment, project, user, chat, application, other]
 *     responses:
 *       200:
 *         description: Raporlar başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get("/my-reports", verifyAccessToken, getMyReports);

/**
 * @swagger
 * /reports/admin:
 *   get:
 *     summary: Tüm raporları listele (Admin)
 *     tags:
 *       - Reports
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, resolved, rejected, cancelled]
 *       - name: reportType
 *         in: query
 *         schema:
 *           type: string
 *           enum: [post, comment, project, user, chat, application, other]
 *       - name: actionTaken
 *         in: query
 *         schema:
 *           type: string
 *           enum: [none, warning, suspension, ban, content removal]
 *       - name: fromDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: toDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: [newest, resolved, oldest]
 *           default: newest
 *     responses:
 *       200:
 *         description: Raporlar başarıyla getirildi
 *       403:
 *         description: Yetkiniz yok
 *       500:
 *         description: Sunucu hatası
 */
router.get("/admin", verifyAccessToken, checkRole("admin"), getAllReports);

/**
 * @swagger
 * /reports/{reportId}:
 *   get:
 *     summary: Tekil rapor detayı (Admin veya Rapor Sahibi)
 *     tags:
 *       - Reports
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: reportId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *     responses:
 *       200:
 *         description: Rapor başarıyla getirildi
 *       403:
 *         description: Bu raporu görüntüleme yetkiniz yok
 *       404:
 *         description: Rapor bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get("/:reportId", verifyAccessToken, getReportById);

/**
 * @swagger
 * /reports/cancel/{reportId}:
 *   post:
 *     summary: Raporu iptal et
 *     description: Sadece beklemede olan raporlar iptal edilebilir
 *     tags:
 *       - Reports
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: reportId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *     responses:
 *       200:
 *         description: Rapor başarıyla iptal edildi
 *       400:
 *         description: Sadece beklemede olan raporlar iptal edilebilir
 *       404:
 *         description: Rapor bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post("/cancel/:reportId", verifyAccessToken, cancelReport);

/**
 * @swagger
 * /reports/resolve/{reportId}:
 *   patch:
 *     summary: Raporu çöz/reddet (Admin)
 *     tags:
 *       - Reports
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: reportId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - actionTaken
 *             properties:
 *               actionTaken:
 *                 type: string
 *                 enum: [none, warning, suspension, ban, content removal]
 *                 description: Alınacak işlem
 *               adminNote:
 *                 type: string
 *                 description: Admin notu (max 1000 karakter)
 *     responses:
 *       200:
 *         description: Rapor başarıyla çözüldü
 *       400:
 *         description: Geçersiz requestId
 *       403:
 *         description: Yetkiniz yok
 *       404:
 *         description: Rapor bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.patch("/resolve/:reportId", verifyAccessToken, checkRole("admin"), resolveReport);

module.exports = router;
