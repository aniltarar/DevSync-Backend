const mongoose = require("mongoose");
const Conversation = require("@/models/conversation");
const Message = require("@/models/message");
const User = require("@/models/user");
const Project = require("@/models/project");


// ========================
// CONVERSATION İŞLEMLERİ
// ========================

// Yeni Sohbet Oluştur
const createConversation = async (req, res) => {
  try {
    const { participantIds, conversationType, projectId, title } = req.body;
    const userId = req.user._id;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({
        message: "En az bir katılımcı belirtilmelidir.",
      });
    }

    // Geçersiz ObjectId kontrolü
    const invalidIds = participantIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: "Geçersiz kullanıcı ID'si.",
      });
    }

    // Duplicate katılımcı kontrolü
    const uniqueParticipantIds = [...new Set(participantIds)];
    if (uniqueParticipantIds.length !== participantIds.length) {
      return res.status(400).json({
        message: "Aynı kullanıcı birden fazla kez eklenemez.",
      });
    }

    // Kendine sohbet açmayı engelle
    if (conversationType === "direct" && participantIds.includes(userId.toString())) {
      return res.status(400).json({
        message: "Kendinizle sohbet başlatamazsınız.",
      });
    }

    // Direct sohbette sadece 1 katılımcı olmalı
    if (conversationType === "direct") {
      if (participantIds.length !== 1) {
        return res.status(400).json({
          message: "Direkt sohbette yalnızca 1 katılımcı olmalıdır.",
        });
      }

      // Aynı kişiyle zaten sohbet var mı kontrol et
      const existingConversation = await Conversation.findOne({
        conversationType: "direct",
        participants: { $all: [userId, participantIds[0]], $size: 2 },
      });

      if (existingConversation) {
        return res.status(200).json({
          message: "Bu kullanıcıyla zaten bir sohbetiniz var.",
          conversation: existingConversation,
        });
      }
    }

    // Grup sohbetinde en az 2 katılımcı olmalı
    if (conversationType === "group" && participantIds.length < 2) {
      return res.status(400).json({
        message: "Grup sohbeti için en az 2 katılımcı gereklidir.",
      });
    }

    // Grup sohbetinde başlık zorunlu
    if (conversationType === "group" && (!title || title.trim().length < 2)) {
      return res.status(400).json({
        message: "Grup sohbeti için başlık gereklidir (min 2 karakter).",
      });
    }

    // Proje sohbetinde projectId zorunlu
    if (conversationType === "project" && !projectId) {
      return res.status(400).json({
        message: "Proje sohbeti için projectId gereklidir.",
      });
    }

    // Katılımcıların varlığını kontrol et
    const users = await User.find({ _id: { $in: participantIds } });
    if (users.length !== participantIds.length) {
      return res.status(404).json({
        message: "Bir veya daha fazla kullanıcı bulunamadı.",
      });
    }

    // Block kontrolü (direct sohbet için)
    if (conversationType === "direct") {
      const currentUser = await User.findById(userId);
      const targetUser = users[0];

      if (currentUser.blockedUsers.includes(targetUser._id)) {
        return res.status(403).json({
          message: "Engellediğiniz kullanıcıyla sohbet başlatamazsınız.",
        });
      }
      if (targetUser.blockedUsers.includes(userId)) {
        return res.status(403).json({
          message: "Bu kullanıcı tarafından engellendiniz.",
        });
      }
    }

    // Proje sohbeti için proje var mı kontrol et
    if (conversationType === "project") {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          message: "Proje bulunamadı.",
        });
      }

      // Aynı proje için zaten sohbet var mı
      const existingProjectConversation = await Conversation.findOne({
        conversationType: "project",
        projectId,
        isActive: true,
      });
      if (existingProjectConversation) {
        return res.status(200).json({
          message: "Bu proje için zaten bir sohbet var.",
          conversation: existingProjectConversation,
        });
      }
    }

    const conversation = new Conversation({
      participants: [userId, ...participantIds],
      conversationType: conversationType || "direct",
      projectId: conversationType === "project" ? projectId : null,
      title: conversationType !== "direct" ? title : null,
    });

    await conversation.save();

    res.status(201).json({
      message: "Sohbet başarıyla oluşturuldu.",
      conversation,
    });
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
    const { limit = 20, skip = 0 } = req.query;

    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    })
      .populate("participants", "username profile.name profile.surname profile.avatarUrl onlineStatus")
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Conversation.countDocuments({
      participants: userId,
      isActive: true,
    });

    res.status(200).json({
      message: "Sohbetler başarıyla getirildi.",
      conversations,
      total,
    });
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
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId).populate(
      "participants",
      "username profile.name profile.surname profile.avatarUrl onlineStatus",
    );

    if (!conversation) {
      return res.status(404).json({
        message: "Sohbet bulunamadı.",
      });
    }

    // Kullanıcı bu sohbetin katılımcısı mı?
    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === userId.toString(),
    );
    if (!isParticipant) {
      return res.status(403).json({
        message: "Bu sohbete erişim yetkiniz yok.",
      });
    }

    res.status(200).json({
      message: "Sohbet detayları başarıyla getirildi.",
      conversation,
    });
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
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Sohbet bulunamadı.",
      });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString(),
    );
    if (!isParticipant) {
      return res.status(403).json({
        message: "Bu işlemi yapmaya yetkiniz yok.",
      });
    }

    if (!conversation.isActive) {
      return res.status(400).json({
        message: "Bu sohbet zaten arşivlenmiş.",
      });
    }

    conversation.isActive = false;
    await conversation.save();

    res.status(200).json({
      message: "Sohbet başarıyla arşivlendi.",
      conversation,
    });
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
    const { conversationId } = req.params;
    const { content, messageType, fileData } = req.body;
    const userId = req.user._id;

    // Sohbet kontrolü
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        message: "Sohbet bulunamadı.",
      });
    }

    if (!conversation.isActive) {
      return res.status(400).json({
        message: "Arşivlenmiş sohbete mesaj gönderilemez.",
      });
    }

    // Katılımcı kontrolü
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString(),
    );
    if (!isParticipant) {
      return res.status(403).json({
        message: "Bu sohbete mesaj gönderme yetkiniz yok.",
      });
    }

    // Content kontrolü
    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Mesaj içeriği boş olamaz.",
      });
    }

    // fileData validasyonu
    if (messageType && messageType !== "text") {
      if (!fileData || !fileData.fileUrl || !fileData.fileName) {
        return res.status(400).json({
          message: "Dosya mesajları için fileData (fileUrl, fileName) gereklidir.",
        });
      }
    }

    // Block kontrolü (direct sohbet için)
    if (conversation.conversationType === "direct") {
      const currentUser = await User.findById(userId);
      const otherParticipantId = conversation.participants.find(
        (p) => p.toString() !== userId.toString(),
      );
      const otherUser = await User.findById(otherParticipantId);

      if (currentUser.blockedUsers.includes(otherParticipantId)) {
        return res.status(403).json({
          message: "Engellediğiniz kullanıcıya mesaj gönderemezsiniz.",
        });
      }
      if (otherUser && otherUser.blockedUsers.includes(userId)) {
        return res.status(403).json({
          message: "Bu kullanıcı tarafından engellendiniz.",
        });
      }
    }

    const message = new Message({
      conversationId,
      senderId: userId,
      content,
      messageType: messageType || "text",
      fileData: messageType && messageType !== "text" ? fileData : undefined,
    });

    await message.save();

    // Sohbetin lastMessage alanını güncelle
    conversation.lastMessage = {
      content,
      senderId: userId,
      timestamp: new Date(),
    };
    await conversation.save();

    res.status(201).json({
      message: "Mesaj başarıyla gönderildi.",
      data: message,
    });
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
    const { conversationId } = req.params;
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    // Sohbet kontrolü
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        message: "Sohbet bulunamadı.",
      });
    }

    // Katılımcı kontrolü
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString(),
    );
    if (!isParticipant) {
      return res.status(403).json({
        message: "Bu sohbetin mesajlarına erişim yetkiniz yok.",
      });
    }

    const filter = { conversationId, isDeleted: false };

    const messages = await Message.find(filter)
      .populate("senderId", "username profile.name profile.surname profile.avatarUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const total = await Message.countDocuments(filter);

    res.status(200).json({
      message: "Mesajlar başarıyla getirildi.",
      messages: messages.reverse(),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        limit,
      },
    });
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
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Mesaj bulunamadı.",
      });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Sadece kendi mesajınızı düzenleyebilirsiniz.",
      });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        message: "Silinmiş mesaj düzenlenemez.",
      });
    }

    if (message.messageType !== "text") {
      return res.status(400).json({
        message: "Sadece metin mesajları düzenlenebilir.",
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Mesaj içeriği boş olamaz.",
      });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    res.status(200).json({
      message: "Mesaj başarıyla düzenlendi.",
      data: message,
    });
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
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Mesaj bulunamadı.",
      });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Sadece kendi mesajınızı silebilirsiniz.",
      });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        message: "Bu mesaj zaten silinmiş.",
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.status(200).json({
      message: "Mesaj başarıyla silindi.",
    });
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
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Sohbet kontrolü
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        message: "Sohbet bulunamadı.",
      });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString(),
    );
    if (!isParticipant) {
      return res.status(403).json({
        message: "Bu işlemi yapmaya yetkiniz yok.",
      });
    }

    // Okunmamış mesajları bul ve işaretle
    const result = await Message.updateMany(
      {
        conversationId,
        isDeleted: false,
        senderId: { $ne: userId },
        "readBy.userId": { $ne: userId },
      },
      {
        $push: {
          readBy: { userId, readAt: new Date() },
        },
      },
    );

    res.status(200).json({
      message: `${result.modifiedCount} mesaj okundu olarak işaretlendi.`,
      modifiedCount: result.modifiedCount,
    });
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
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        message: "Sohbet bulunamadı.",
      });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString(),
    );
    if (!isParticipant) {
      return res.status(403).json({
        message: "Bu sohbete erişim yetkiniz yok.",
      });
    }

    const unreadCount = await Message.countDocuments({
      conversationId,
      isDeleted: false,
      senderId: { $ne: userId },
      "readBy.userId": { $ne: userId },
    });

    res.status(200).json({
      conversationId,
      unreadCount,
    });
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
