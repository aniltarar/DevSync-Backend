const chatService = require("@/services/chatService");
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

// ========================
// MESAJ İŞLEMLERİ
// ========================

// Mesaj Gönder
const sendMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const result = await chatService.sendMessage(userId, conversationId, req.body);

    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    // Socket.IO broadcast — odadaki herkese yeni mesajı ilet
    try {
      const io = getIO();
      io.to(conversationId).emit("newMessage", result.data.data);
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
      io.to(editedMsg.conversationId.toString()).emit("messageEdited", {
        messageId,
        content: editedMsg.content,
        editedAt: editedMsg.editedAt,
      });
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
  getConversations,
  getConversationById,
  deleteConversation,
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  markAsRead,
  getUnreadCount,
};
