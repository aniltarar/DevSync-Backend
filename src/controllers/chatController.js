const chatService = require("@/services/chatService");
const Conversation = require("@/models/conversation");
const { getIO } = require("@/socket/socketServer");

// ========================
// CONVERSATION İŞLEMLERİ
// ========================

// Yeni Sohbet Oluştur
const createConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await chatService.createConversation(userId, req.body);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      message: "Sohbet oluşturulurken hata oluştu.",
      error: error.message,
    });
  }
};

// Kullanıcının Tüm Sohbetlerini Getir
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await chatService.getConversations(userId, req.query);

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      message: "Sohbetler getirilirken hata oluştu.",
      error: error.message,
    });
  }
};

// Sohbet Detaylarını Getir
const getConversationById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const result = await chatService.getConversationById(userId, conversationId);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      message: "Sohbet detayları getirilirken hata oluştu.",
      error: error.message,
    });
  }
};

// Sohbeti Arşivle (Soft Delete)
const deleteConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const result = await chatService.deleteConversation(userId, conversationId);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      message: "Sohbet arşivlenirken hata oluştu.",
      error: error.message,
    });
  }
};

// Arşivlenmiş Sohbetleri Getir
const getArchivedConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await chatService.getArchivedConversations(userId, req.query);

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      message: "Arşivlenmiş sohbetler getirilirken hata oluştu.",
      error: error.message,
    });
  }
};

// Sohbeti Arşivden Çıkar
const unarchiveConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const result = await chatService.unarchiveConversation(userId, conversationId);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      message: "Sohbet arşivden çıkarılırken hata oluştu.",
      error: error.message,
    });
  }
};

// ========================
// MESAJ İŞLEMLERİ
// ========================

// Mesaj Gönder
const sendMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    // Multer ile yüklenen dosya varsa fileData ve messageType oluştur
    const messageData = { ...req.body };
    if (req.file) {
      const isImage = req.file.mimetype.startsWith("image/");
      messageData.messageType = isImage ? "image" : "file";
      messageData.fileData = {
        fileName: req.file.originalname,
        fileUrl: `/uploads/${isImage ? "images" : "files"}/${req.file.filename}`,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      };
    }

    const result = await chatService.sendMessage(userId, conversationId, messageData);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    // Socket.IO broadcast — odadaki herkese yeni mesajı ilet
    try {
      const io = getIO();
      io.to(conversationId).emit("newMessage", result.data.data);

      // Katılımcıların kişisel odalarına da gönder (sidebar güncellemesi için)
      const conv = await Conversation.findById(conversationId);
      if (conv) {
        conv.participants.forEach((pId) => {
          io.to(`user:${pId.toString()}`).emit("conversationUpdated", {
            conversationId,
            lastMessage: {
              content: result.data.data.content,
              senderId: userId,
              timestamp: new Date(),
            },
          });
        });
      }
    } catch (_) {
      // Socket henüz başlatılmamışsa broadcast atlanır
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      message: "Mesaj gönderilirken hata oluştu.",
      error: error.message,
    });
  }
};

// Sohbetteki Mesajları Getir (Pagination)
const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const result = await chatService.getMessages(userId, conversationId, req.query);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      message: "Mesajlar getirilirken hata oluştu.",
      error: error.message,
    });
  }
};

// Mesajı Düzenle
const editMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    const { content } = req.body;
    const result = await chatService.editMessage(userId, messageId, content);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    // Socket.IO broadcast — odadaki herkese mesaj düzenlemesini bildir
    try {
      const io = getIO();
      const editedMsg = result.data.data;
      const conversationId = editedMsg.conversationId.toString();
      io.to(conversationId).emit("messageEdited", {
        messageId,
        content: editedMsg.content,
        editedAt: editedMsg.editedAt,
      });

      // Sidebar güncellemesi — son mesaj düzenlenmişse yansısın
      const conv = await Conversation.findById(conversationId);
      if (conv && conv.lastMessage?.senderId?.toString() === userId.toString()) {
        conv.lastMessage.content = editedMsg.content;
        await conv.save();
        conv.participants.forEach((pId) => {
          io.to(`user:${pId.toString()}`).emit("conversationUpdated", {
            conversationId,
            lastMessage: {
              content: editedMsg.content,
              senderId: userId,
              timestamp: conv.lastMessage.timestamp,
            },
          });
        });
      }
    } catch (_) {
      // Socket henüz başlatılmamışsa broadcast atlanır
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      message: "Mesaj düzenlenirken hata oluştu.",
      error: error.message,
    });
  }
};

// Mesajı Sil (Soft Delete)
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    const result = await chatService.deleteMessage(userId, messageId);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    // Socket.IO broadcast — odadaki herkese mesaj silinmesini bildir
    try {
      const io = getIO();
      io.to(result.data.conversationId.toString()).emit("messageDeleted", { messageId });
    } catch (_) {
      // Socket henüz başlatılmamışsa broadcast atlanır
    }

    res.status(result.status).json({ message: result.data.message });
  } catch (error) {
    res.status(500).json({
      message: "Mesaj silinirken hata oluştu.",
      error: error.message,
    });
  }
};

// Mesajları Okundu Olarak İşaretle
const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const result = await chatService.markAsRead(userId, conversationId);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    // Socket.IO broadcast — odadaki diğer kullanıcılara bildir
    try {
      const io = getIO();
      io.to(conversationId).emit("messagesRead", {
        conversationId,
        userId,
        readCount: result.data.modifiedCount,
      });
    } catch (_) {
      // Socket henüz başlatılmamışsa broadcast atlanır
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      message: "Mesajlar okundu olarak işaretlenirken hata oluştu.",
      error: error.message,
    });
  }
};

// Gruba Üye Ekle
const addGroupMember = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { userId: targetUserId } = req.body;
    const result = await chatService.addGroupMember(userId, conversationId, targetUserId);

    if (result.error) return res.status(result.status).json({ message: result.error });

    try {
      const io = getIO();
      io.to(conversationId).emit("groupMemberAdded", { conversationId, conversation: result.data.conversation });
    } catch (_) {}

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Üye eklenirken hata oluştu.", error: error.message });
  }
};

// Gruptan Üye Çıkar / Ayrıl
const removeGroupMember = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId, targetUserId } = req.params;
    const result = await chatService.removeGroupMember(userId, conversationId, targetUserId);

    if (result.error) return res.status(result.status).json({ message: result.error });

    try {
      const io = getIO();
      io.to(conversationId).emit("groupMemberRemoved", result.data);
    } catch (_) {}

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Üye çıkarılırken hata oluştu.", error: error.message });
  }
};

// Aktif Projelerin Sohbetlerini Senkronize Et
const syncProjectConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await chatService.syncProjectConversations(userId);
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Senkronizasyon sırasında hata oluştu.", error: error.message });
  }
};

// Proje Sohbetini Getir veya Oluştur
const getOrCreateProjectConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { projectId } = req.params;
    const result = await chatService.getOrCreateProjectConversation(userId, projectId);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      message: "Proje sohbeti oluşturulurken hata oluştu.",
      error: error.message,
    });
  }
};

// Okunmamış Mesaj Sayısını Getir
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const result = await chatService.getUnreadCount(userId, conversationId);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      message: "Okunmamış mesaj sayısı getirilirken hata oluştu.",
      error: error.message,
    });
  }
};

module.exports = {
  createConversation,
  addGroupMember,
  removeGroupMember,
  syncProjectConversations,
  getOrCreateProjectConversation,
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
};
