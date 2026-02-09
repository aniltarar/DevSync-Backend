const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("@/middlewares/authMiddleware");

const {
  applyToProjectSlot,
  getMyApplications,
  cancelApplication,
  viewApplicationsByPID,
  acceptApplication,
  rejectApplication,
} = require("@/controllers/applicationController");

/**
 * @swagger
 * /applications/apply:
 *   post:
 *     summary: Projeye pozisyon için başvur
 *     tags:
 *       - Applications
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - slotId
 *             properties:
 *               projectId:
 *                 type: string
 *                 example: 6574337cf052d49b0afb45ab
 *                 description: Başvuru yapılacak projenin ID'si
 *               slotId:
 *                 type: string
 *                 example: 6574337cf052d49b0afb45ac
 *                 description: Başvuru yapılacak pozisyon ID'si
 *               message:
 *                 type: string
 *                 example: Bu pozisyon için çok ilgili ve yetenekliyim.
 *                 description: Başvuru mesajı (opsiyonel, max 1000 karakter)
 *     responses:
 *       201:
 *         description: Başvuru başarıyla gönderildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 application:
 *                   $ref: '#/components/schemas/Application'
 *       400:
 *         description: Geçersiz istek (kota dolu, zaten başvuru yapılmış vb.)
 *       404:
 *         description: Kullanıcı, proje veya slot bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post("/apply", verifyAccessToken, applyToProjectSlot);

/**
 * @swagger
 * /applications/my-applications:
 *   get:
 *     summary: Kendi başvurularını getir
 *     tags:
 *       - Applications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Başvurular başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 applications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Application'
 *       500:
 *         description: Sunucu hatası
 */
router.get("/my-applications", verifyAccessToken, getMyApplications);

/**
 * @swagger
 * /applications/cancel/{applicationId}:
 *   delete:
 *     summary: Başvuruyu iptal et
 *     description: Yalnızca pending ve cancelled olmayan başvurular iptal edilebilir
 *     tags:
 *       - Applications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: applicationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *         description: İptal edilecek başvurunun ID'si
 *     responses:
 *       200:
 *         description: Başvuru başarıyla iptal edildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 application:
 *                   $ref: '#/components/schemas/Application'
 *       403:
 *         description: Yetkiniz yok (başka kullanıcının başvurusu)
 *       404:
 *         description: Başvuru bulunamadı
 *       400:
 *         description: Geçersiz işlem (onaylanmış, reddedilmiş veya zaten iptal edilmiş)
 *       500:
 *         description: Sunucu hatası
 */
router.delete("/cancel/:applicationId", verifyAccessToken, cancelApplication);

/**
 * @swagger
 * /applications/{projectId}:
 *   get:
 *     summary: Proje başvurularını görüntüle (proje sahibi)
 *     description: Projeye gelen tüm başvuruları görüntülemek için proje sahibi olmanız gerekir
 *     tags:
 *       - Applications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *         description: Projenin ID'si
 *     responses:
 *       200:
 *         description: Başvurular başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 applications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Application'
 *       403:
 *         description: Yetkiniz yok (proje sahibi değilsiniz)
 *       404:
 *         description: Proje bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get("/:projectId", verifyAccessToken, viewApplicationsByPID);

/**
 * @swagger
 * /applications/accept/{applicationId}:
 *   post:
 *     summary: Başvuruyu onayla (proje sahibi)
 *     description: Başvuran kullanıcıyı pozisyona ekle. Kota doluysa diğer pending başvurular otomatik reddedilir.
 *     tags:
 *       - Applications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: applicationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *         description: Onaylanacak başvurunun ID'si
 *     responses:
 *       200:
 *         description: Başvuru başarıyla onaylandı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 application:
 *                   $ref: '#/components/schemas/Application'
 *       403:
 *         description: Yetkiniz yok (proje sahibi değilsiniz)
 *       404:
 *         description: Başvuru, proje veya slot bulunamadı
 *       400:
 *         description: Geçersiz işlem (kota dolu, zaten onaylanmış/reddedilmiş, kullanıcı zaten eklenmiş)
 *       500:
 *         description: Sunucu hatası
 */
router.post("/accept/:applicationId", verifyAccessToken, acceptApplication);

/**
 * @swagger
 * /applications/reject/{applicationId}:
 *   post:
 *     summary: Başvuruyu reddet (proje sahibi)
 *     tags:
 *       - Applications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: applicationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *         description: Reddedilecek başvurunun ID'si
 *     responses:
 *       200:
 *         description: Başvuru başarıyla reddedildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 application:
 *                   $ref: '#/components/schemas/Application'
 *       403:
 *         description: Yetkiniz yok (proje sahibi değilsiniz)
 *       404:
 *         description: Başvuru veya proje bulunamadı
 *       400:
 *         description: Geçersiz işlem (zaten reddedilmiş veya onaylanmış)
 *       500:
 *         description: Sunucu hatası
 */
router.post("/reject/:applicationId", verifyAccessToken, rejectApplication);

module.exports = router;
