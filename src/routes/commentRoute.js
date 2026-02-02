const express = require("express");
const router = express.Router();

const {
  createComment,
  getCommentsByPostId,
  updateComment,
  deleteComment,
  likeComment,
} = require("@/controllers/commentController");
const { verifyAccessToken } = require("@/middlewares/authMiddleware");

/**
 * @swagger
 * /comments:
 *   post:
 *     summary: Yeni yorum oluştur
 *     tags:
 *       - Comments
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *               - content
 *             properties:
 *               postId:
 *                 type: string
 *                 example: 6574337cf052d49b0afb45ab
 *                 description: Yorumun yapılacağı postun ID'si
 *               content:
 *                 type: string
 *                 example: Bu çok iyi bir gönderi!
 *                 description: Yorum içeriği (1-1000 karakter)
 *               parentCommentId:
 *                 type: string
 *                 example: 6574337cf052d49b0afb45ac
 *                 description: Alt yorum ise üst yorumun ID'si (opsiyonel)
 *     responses:
 *       201:
 *         description: Yorum başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */
router.post("/", verifyAccessToken, createComment);

/**
 * @swagger
 * /comments/post/{postId}:
 *   get:
 *     summary: Bir gönderinin tüm yorumlarını getir
 *     tags:
 *       - Comments
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: postId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *         description: Postun ID'si
 *     responses:
 *       200:
 *         description: Yorumlar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Geçersiz post ID'si
 *       500:
 *         description: Sunucu hatası
 */
router.get("/post/:postId", verifyAccessToken, getCommentsByPostId);

/**
 * @swagger
 * /comments/{commentId}:
 *   put:
 *     summary: Yorumu güncelle (yorum sahibi)
 *     tags:
 *       - Comments
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: commentId
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Güncellenmiş yorum içeriği
 *     responses:
 *       200:
 *         description: Yorum başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Yorum bulunamadı veya yetkiniz yok
 *       500:
 *         description: Sunucu hatası
 */
router.put("/:commentId", verifyAccessToken, updateComment);

/**
 * @swagger
 * /comments/{commentId}:
 *   delete:
 *     summary: Yorumu sil (yorum sahibi)
 *     tags:
 *       - Comments
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: commentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *     responses:
 *       200:
 *         description: Yorum başarıyla silindi
 *       404:
 *         description: Yorum bulunamadı veya yetkiniz yok
 *       500:
 *         description: Sunucu hatası
 */
router.delete("/:commentId", verifyAccessToken, deleteComment);

/**
 * @swagger
 * /comments/{commentId}/like:
 *   post:
 *     summary: Yorumu beğen/beğeniyi kaldır
 *     description: Yorumu beğen veya önceden beğenmişse beğeniyi kaldır (toggle)
 *     tags:
 *       - Comments
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: commentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *     responses:
 *       200:
 *         description: Beğeni işlemi başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Yorum beğenildi."
 *       404:
 *         description: Yorum bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post("/:commentId/like", verifyAccessToken, likeComment);

module.exports = router;
