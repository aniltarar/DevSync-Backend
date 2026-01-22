const express = require("express");
const router = express.Router();

const {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
} = require("@/controllers/postController");
const { verifyAccessToken } = require("@/middlewares/authMiddleware");

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Tüm gönderileri listele
 *     description: "Sayfalandırma, filtre ve sıralama desteklenir. Varsayılan: yeni→eski (createdAt:desc)."
 *     tags:
 *       - Posts
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
 *         example: 10
 *         description: Sayfa başına kayıt sayısı
 *       - name: author
 *         in: query
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *         description: Yazar ID (Mongo ObjectId) ile filtrele
 *       - name: tag
 *         in: query
 *         schema:
 *           type: string
 *         example: react
 *         description: Belirli bir etikete göre filtrele
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *         example: createdAt:asc
 *         description: >
 *           Sıralama alanı ve yön (format: field veya field:asc|desc).
 *           Desteklenen alanlar: createdAt, updatedAt, authorId, content.
 *           Varsayılan: createdAt:desc (yeni→eski).
 *     responses:
 *       200:
 *         description: Gönderiler başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalPosts:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       400:
 *         description: Geçersiz query parametresi
 *       500:
 *         description: Sunucu hatası
 */
router.get("/", verifyAccessToken, getAllPosts);

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Yeni gönderi oluştur
 *     tags:
 *       - Posts
 *     security:
 *       - BearerAuth: []
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
 *                 example: Merhaba dünya!
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [react, nodejs]
 *     responses:
 *       201:
 *         description: Gönderi oluşturuldu
 *       400:
 *         description: Geçersiz istek
 */
router.post("/", verifyAccessToken, createPost);

/**
 * @swagger
 * /posts/{postId}:
 *   get:
 *     summary: Tek bir gönderiyi getir
 *     tags:
 *       - Posts
 *     parameters:
 *       - name: postId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Gönderi başarıyla getirildi
 *       404:
 *         description: Gönderi bulunamadı
 */
router.get("/:postId", verifyAccessToken, getPostById);

/**
 * @swagger
 * /posts/{postId}:
 *   put:
 *     summary: Gönderiyi güncelle (sahip)
 *     tags:
 *       - Posts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: postId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Güncelleme başarılı
 *       403:
 *         description: Yetki yok
 */
router.put("/:postId", verifyAccessToken, updatePost);

/**
 * @swagger
 * /posts/{postId}:
 *   delete:
 *     summary: Gönderiyi sil (sahip)
 *     tags:
 *       - Posts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: postId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Silme başarılı
 *       403:
 *         description: Yetki yok
 */
router.delete("/:postId", verifyAccessToken, deletePost);

module.exports = router;
