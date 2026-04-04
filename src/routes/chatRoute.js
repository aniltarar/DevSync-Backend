const express = require("express");
const router = express.Router();

const {
  createConversation,
  getConversations,
  getArchivedConversations,
  getConversationById,
  deleteConversation,
  unarchiveConversation,
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  markAsRead,
  getUnreadCount,
} = require("@/controllers/chatController");
const { verifyAccessToken } = require("@/middlewares/authMiddleware");
const { uploadChatFile, handleMulterError } = require("@/config/multerConfig");

/**
 * @swagger
 * /chat/conversations:
 *   post:
 *     summary: Yeni sohbet oluştur
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantIds
 *             properties:
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["6574337cf052d49b0afb45ab"]
 *                 description: Katılımcı kullanıcı ID'leri
 *               conversationType:
 *                 type: string
 *                 enum: [direct, group, project]
 *                 default: direct
 *                 description: Sohbet türü
 *               projectId:
 *                 type: string
 *                 description: Proje sohbeti için proje ID'si
 *               title:
 *                 type: string
 *                 description: Grup/proje sohbeti başlığı (min 2, max 100 karakter)
 *     responses:
 *       201:
 *         description: Sohbet başarıyla oluşturuldu
 *       200:
 *         description: Bu kullanıcıyla zaten bir sohbet var (direct)
 *       400:
 *         description: Geçersiz istek
 *       403:
 *         description: Engellenmiş kullanıcı
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.post("/conversations", verifyAccessToken, createConversation);

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     summary: Kullanıcının tüm sohbetlerini getir
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Sayfa başına sohbet sayısı
 *       - name: skip
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Atlanacak kayıt sayısı
 *     responses:
 *       200:
 *         description: Sohbetler başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get("/conversations", verifyAccessToken, getConversations);

router.get("/conversations/archived", verifyAccessToken, getArchivedConversations);

/**
 * @swagger
 * /chat/conversations/{conversationId}:
 *   get:
 *     summary: Sohbet detaylarını getir
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *     responses:
 *       200:
 *         description: Sohbet detayları başarıyla getirildi
 *       403:
 *         description: Bu sohbete erişim yetkiniz yok
 *       404:
 *         description: Sohbet bulunamadı
 */
router.get("/conversations/:conversationId", verifyAccessToken, getConversationById);

/**
 * @swagger
 * /chat/conversations/{conversationId}:
 *   delete:
 *     summary: Sohbeti arşivle (soft delete)
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *     responses:
 *       200:
 *         description: Sohbet başarıyla arşivlendi
 *       400:
 *         description: Sohbet zaten arşivlenmiş
 *       403:
 *         description: Yetki yok
 *       404:
 *         description: Sohbet bulunamadı
 */
router.delete("/conversations/:conversationId", verifyAccessToken, deleteConversation);

router.patch("/conversations/:conversationId/unarchive", verifyAccessToken, unarchiveConversation);

// ========================
// MESSAGE ROUTE'LARI
// ========================

/**
 * @swagger
 * /chat/conversations/{conversationId}/messages:
 *   post:
 *     summary: Mesaj gönder (dosya ekli veya metin)
 *     description: >
 *       Metin mesajı veya dosya ekli mesaj gönderir.
 *       Dosya göndermek için multipart/form-data kullanılmalıdır.
 *       Desteklenen dosya türleri: JPEG, PNG, GIF, WebP (max 10MB).
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 6574337cf052d49b0afb45ab
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Mesaj içeriği (max 300 karakter)
 *                 example: Merhaba!
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file, notification]
 *                 default: text
 *                 description: Mesaj türü (dosya yüklenirse otomatik belirlenir)
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "Eklenecek dosya (JPEG/PNG/GIF/WebP, max 10MB)"
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Merhaba!
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file, notification]
 *                 default: text
 *     responses:
 *       201:
 *         description: Mesaj başarıyla gönderildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mesaj başarıyla gönderildi.
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     conversationId:
 *                       type: string
 *                     senderId:
 *                       type: object
 *                     content:
 *                       type: string
 *                     messageType:
 *                       type: string
 *                     fileData:
 *                       type: object
 *                       properties:
 *                         fileName:
 *                           type: string
 *                         fileUrl:
 *                           type: string
 *                         fileType:
 *                           type: string
 *                         fileSize:
 *                           type: number
 *       400:
 *         description: Arşivlenmiş sohbete mesaj gönderilemez veya dosya hatası
 *       403:
 *         description: Yetki yok veya engellenmiş kullanıcı
 *       404:
 *         description: Sohbet bulunamadı
 */
router.post("/conversations/:conversationId/messages", verifyAccessToken, uploadChatFile, handleMulterError, sendMessage);

/**
 * @swagger
 * /chat/conversations/{conversationId}/messages:
 *   get:
 *     summary: Sohbetteki mesajları getir (sayfalandırmalı)
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Mesajlar başarıyla getirildi
 *       403:
 *         description: Bu sohbetin mesajlarına erişim yetkiniz yok
 *       404:
 *         description: Sohbet bulunamadı
 */
router.get("/conversations/:conversationId/messages", verifyAccessToken, getMessages);

/**
 * @swagger
 * /chat/conversations/{conversationId}/read:
 *   post:
 *     summary: Mesajları okundu olarak işaretle
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mesajlar okundu olarak işaretlendi
 *       403:
 *         description: Yetki yok
 *       404:
 *         description: Sohbet bulunamadı
 */
router.post("/conversations/:conversationId/read", verifyAccessToken, markAsRead);

/**
 * @swagger
 * /chat/conversations/{conversationId}/unread:
 *   get:
 *     summary: Okunmamış mesaj sayısını getir
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Okunmamış mesaj sayısı
 *       403:
 *         description: Erişim yetkiniz yok
 *       404:
 *         description: Sohbet bulunamadı
 */
router.get("/conversations/:conversationId/unread", verifyAccessToken, getUnreadCount);

/**
 * @swagger
 * /chat/messages/{messageId}:
 *   put:
 *     summary: Mesajı düzenle
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: messageId
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
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Düzenlenmiş mesaj
 *     responses:
 *       200:
 *         description: Mesaj başarıyla düzenlendi
 *       400:
 *         description: Silinmiş mesaj düzenlenemez
 *       403:
 *         description: Sadece kendi mesajınızı düzenleyebilirsiniz
 *       404:
 *         description: Mesaj bulunamadı
 */
router.put("/messages/:messageId", verifyAccessToken, editMessage);

/**
 * @swagger
 * /chat/messages/{messageId}:
 *   delete:
 *     summary: Mesajı sil (soft delete)
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: messageId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mesaj başarıyla silindi
 *       400:
 *         description: Mesaj zaten silinmiş
 *       403:
 *         description: Sadece kendi mesajınızı silebilirsiniz
 *       404:
 *         description: Mesaj bulunamadı
 */
router.delete("/messages/:messageId", verifyAccessToken, deleteMessage);

module.exports = router;
