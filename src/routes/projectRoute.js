const express = require("express");
const router = express.Router();

const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addSlot,
  updateSlot,
  deleteSlot,
  getMyProjects,
} = require("@/controllers/projectController");
const { verifyAccessToken } = require("@/middlewares/authMiddleware");

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Yeni proje oluştur
 *     description: Giriş yapan kullanıcı tarafından yeni proje oluşturma
 *     tags:
 *       - Projects
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 example: E-commerce Platform
 *               description:
 *                 type: string
 *                 example: Modern e-commerce sistemi geliştiriyoruz, React ve Node.js kullanacağız
 *               category:
 *                 type: string
 *                 enum: [web, mobile, desktop, ai, game, devops, other]
 *                 example: web
 *               projectType:
 *                 type: string
 *                 enum: [personal, team, open-source, freelance]
 *                 example: team
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     roleName:
 *                       type: string
 *                       example: Frontend Developer
 *                     requiredSkills:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [React, TypeScript]
 *                     optionalSkills:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [Next.js, Tailwind CSS]
 *                     quota:
 *                       type: number
 *                       example: 2
 *     responses:
 *       201:
 *         description: Proje başarıyla oluşturuldu
 *       400:
 *         description: Gerekli alanlar eksik
 *       401:
 *         description: Token bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post("/", verifyAccessToken, createProject);

/**
 * @swagger
 * /projects/my-projects:
 *   get:
 *     summary: Kendi projelerim
 *     description: Giriş yapan kullanıcının oluşturduğu tüm projeleri getir
 *     tags:
 *       - Projects
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Projeler başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 data:
 *                   type: array
 *       401:
 *         description: Token bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get("/my-projects", verifyAccessToken, getMyProjects);

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Tüm projeleri listele
 *     description: Tüm projeleri filtreleme seçenekleri ile listele
 *     tags:
 *       - Projects
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [draft, pending, active, closed, rejected]
 *         example: active
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *           enum: [web, mobile, desktop, ai, game, devops, other]
 *         example: web
 *       - name: projectType
 *         in: query
 *         schema:
 *           type: string
 *           enum: [personal, team, open-source, freelance]
 *         example: team
 *     responses:
 *       200:
 *         description: Projeler başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 data:
 *                   type: array
 *       500:
 *         description: Sunucu hatası
 */
router.get("/", verifyAccessToken, getAllProjects);

/**
 * @swagger
 * /projects/{projectId}:
 *   get:
 *     summary: Proje detayını getir
 *     description: Belirli bir projenin tüm detaylarını getir
 *     tags:
 *       - Projects
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *     responses:
 *       200:
 *         description: Proje başarıyla getirildi
 *       404:
 *         description: Proje bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get("/:projectId", getProjectById);

/**
 * @swagger
 * /projects/{projectId}:
 *   put:
 *     summary: Proje güncelle
 *     description: Projenin detaylarını güncelle (sadece sahibi)
 *     tags:
 *       - Projects
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: projectId
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
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated E-commerce
 *               description:
 *                 type: string
 *                 example: Güncellenmiş açıklama
 *               category:
 *                 type: string
 *                 enum: [web, mobile, desktop, ai, game, devops, other]
 *               projectType:
 *                 type: string
 *                 enum: [personal, team, open-source, freelance]
 *               status:
 *                 type: string
 *                 enum: [draft, pending, active, closed, rejected]
 *     responses:
 *       200:
 *         description: Proje başarıyla güncellendi
 *       403:
 *         description: Bu işlemi yapmaya yetkiniz yok
 *       404:
 *         description: Proje bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put("/:projectId", verifyAccessToken, updateProject);

/**
 * @swagger
 * /projects/{projectId}:
 *   delete:
 *     summary: Proje sil
 *     description: Projeyi sil (sadece sahibi)
 *     tags:
 *       - Projects
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *     responses:
 *       200:
 *         description: Proje başarıyla silindi
 *       403:
 *         description: Bu işlemi yapmaya yetkiniz yok
 *       404:
 *         description: Proje bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete("/:projectId", verifyAccessToken, deleteProject);

/**
 * @swagger
 * /projects/{projectId}/slots:
 *   post:
 *     summary: Slot ekle
 *     description: Projeye yeni bir rol/slot ekle
 *     tags:
 *       - Slots
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: projectId
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
 *               - roleName
 *               - requiredSkills
 *               - quota
 *             properties:
 *               roleName:
 *                 type: string
 *                 example: Backend Developer
 *               requiredSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [Node.js, MongoDB, REST API]
 *               optionalSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [PostgreSQL, GraphQL]
 *               quota:
 *                 type: number
 *                 example: 3
 *     responses:
 *       201:
 *         description: Slot başarıyla eklendi
 *       400:
 *         description: Gerekli alanlar eksik
 *       403:
 *         description: Bu işlemi yapmaya yetkiniz yok
 *       404:
 *         description: Proje bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post("/:projectId/slots", verifyAccessToken, addSlot);

/**
 * @swagger
 * /projects/{projectId}/slots/{slotId}:
 *   put:
 *     summary: Slot güncelle
 *     description: Slot detaylarını güncelle
 *     tags:
 *       - Slots
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *       - name: slotId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ac
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleName:
 *                 type: string
 *                 example: Senior Backend Developer
 *               requiredSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [Node.js, MongoDB, AWS]
 *               optionalSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [Docker, Kubernetes]
 *               quota:
 *                 type: number
 *                 example: 2
 *               status:
 *                 type: string
 *                 enum: [open, filled]
 *                 example: open
 *     responses:
 *       200:
 *         description: Slot başarıyla güncellendi
 *       403:
 *         description: Bu işlemi yapmaya yetkiniz yok
 *       404:
 *         description: Slot veya proje bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put("/:projectId/slots/:slotId", verifyAccessToken, updateSlot);

/**
 * @swagger
 * /projects/{projectId}/slots/{slotId}:
 *   delete:
 *     summary: Slot sil
 *     description: Slotu sil
 *     tags:
 *       - Slots
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *       - name: slotId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ac
 *     responses:
 *       200:
 *         description: Slot başarıyla silindi
 *       403:
 *         description: Bu işlemi yapmaya yetkiniz yok
 *       404:
 *         description: Slot veya proje bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete("/:projectId/slots/:slotId", verifyAccessToken, deleteSlot);

module.exports = router;
