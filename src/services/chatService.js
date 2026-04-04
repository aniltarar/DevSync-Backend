const mongoose = require("mongoose");
const Conversation = require("@/models/conversation");
const Message = require("@/models/message");
const User = require("@/models/user");
const Project = require("@/models/project");
const { createNotification } = require("@/services/notificationService");

// ========================
// CONVERSATION İŞLEMLERİ
// ========================

const createConversation = async (userId, { participantIds, conversationType, projectId, title }) => {
  if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
    return { status: 400, error: "En az bir katılımcı belirtilmelidir." };
  }

  // Geçersiz ObjectId kontrolü
  const invalidIds = participantIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    return { status: 400, error: "Geçersiz kullanıcı ID'si." };
  }

  // Duplicate katılımcı kontrolü
  const uniqueParticipantIds = [...new Set(participantIds)]; // => Set ile tanımlayarak uniq elemanları alıyoruz
  if (uniqueParticipantIds.length !== participantIds.length) {
    return { status: 400, error: "Aynı kullanıcı birden fazla kez eklenemez." };
  }

  // Kendine sohbet açmayı engelle
  if (conversationType === "direct" && participantIds.includes(userId.toString())) {
    return { status: 400, error: "Kendinizle sohbet başlatamazsınız." };
  }

  // Direct sohbette sadece 1 katılımcı olmalı
  if (conversationType === "direct") {
    if (participantIds.length !== 1) {
      return { status: 400, error: "Direkt sohbette yalnızca 1 katılımcı olmalıdır." };
    }

    // Aynı kişiyle zaten sohbet var mı kontrol et
    const existingConversation = await Conversation.findOne({
      conversationType: "direct",
      participants: { $all: [userId, participantIds[0]], $size: 2 },
    });

    if (existingConversation) {
      return {
        status: 200,
        data: { message: "Bu kullanıcıyla zaten bir sohbetiniz var.", conversation: existingConversation },
      };
    }
  }

  // Grup sohbetinde en az 2 katılımcı olmalı
  if (conversationType === "group" && participantIds.length < 2) {
    return { status: 400, error: "Grup sohbeti için en az 2 katılımcı gereklidir." };
  }

  // Grup sohbetinde başlık zorunlu
  if (conversationType === "group" && (!title || title.trim().length < 2)) {
    return { status: 400, error: "Grup sohbeti için başlık gereklidir (min 2 karakter)." };
  }

  // Proje sohbetinde projectId zorunlu
  if (conversationType === "project" && !projectId) {
    return { status: 400, error: "Proje sohbeti için projectId gereklidir." };
  }

  // Katılımcıların varlığını kontrol et
  const users = await User.find({ _id: { $in: participantIds } });
  if (users.length !== participantIds.length) {
    return { status: 404, error: "Bir veya daha fazla kullanıcı bulunamadı." };
  }

  // Block kontrolü (direct sohbet için)
  if (conversationType === "direct") {
    const currentUser = await User.findById(userId);
    const targetUser = users[0];

    if (currentUser.blockedUsers.includes(targetUser._id)) {
      return { status: 403, error: "Engellediğiniz kullanıcıyla sohbet başlatamazsınız." };
    }
    if (targetUser.blockedUsers.includes(userId)) {
      return { status: 403, error: "Bu kullanıcı tarafından engellendiniz." };
    }
  }

  // Proje sohbeti için proje var mı kontrol et
  if (conversationType === "project") {
    const project = await Project.findById(projectId);
    if (!project) {
      return { status: 404, error: "Proje bulunamadı." };
    }

    // Aynı proje için zaten sohbet var mı
    const existingProjectConversation = await Conversation.findOne({
      conversationType: "project",
      projectId,
      isActive: true,
    });
    if (existingProjectConversation) {
      return {
        status: 200,
        data: { message: "Bu proje için zaten bir sohbet var.", conversation: existingProjectConversation },
      };
    }
  }

  const conversation = await Conversation.create({
    participants: [userId, ...participantIds],
    conversationType: conversationType || "direct",
    projectId: conversationType === "project" ? projectId : null,
    title: conversationType !== "direct" ? title : null,
  });

  return {
    status: 201,
    data: { message: "Sohbet başarıyla oluşturuldu.", conversation },
  };
};

const getConversations = async (userId, { limit = 20, skip = 0 }) => {
  const [conversations, total] = await Promise.all([
    Conversation.find({ participants: userId, isActive: true })
      .populate("participants", "username profile.name profile.surname profile.avatarUrl onlineStatus lastSeenAt")
      .populate("lastMessage.senderId", "username profile.name profile.surname")
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean(),
    Conversation.countDocuments({ participants: userId, isActive: true }),
  ]);

  // Her sohbet için okunmamış mesaj sayısını ekle
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        isDeleted: false,
        senderId: { $ne: userId },
        "readBy.userId": { $ne: userId },
      });
      return { ...conv, unreadCount };
    }),
  );

  return {
    status: 200,
    data: { message: "Sohbetler başarıyla getirildi.", conversations: conversationsWithUnread, total },
  };
};

const getConversationById = async (userId, conversationId) => {
  const conversation = await Conversation.findById(conversationId).populate(
    "participants",
    "username profile.name profile.surname profile.avatarUrl onlineStatus lastSeenAt",
  );

  if (!conversation) {
    return { status: 404, error: "Sohbet bulunamadı." };
  }

  const isParticipant = conversation.participants.some(
    (p) => p._id.toString() === userId.toString(),
  );
  if (!isParticipant) {
    return { status: 403, error: "Bu sohbete erişim yetkiniz yok." };
  }

  return {
    status: 200,
    data: { message: "Sohbet detayları başarıyla getirildi.", conversation },
  };
};

const deleteConversation = async (userId, conversationId) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return { status: 404, error: "Sohbet bulunamadı." };
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString(),
  );
  if (!isParticipant) {
    return { status: 403, error: "Bu işlemi yapmaya yetkiniz yok." };
  }

  if (!conversation.isActive) {
    return { status: 400, error: "Bu sohbet zaten arşivlenmiş." };
  }

  conversation.isActive = false;
  await conversation.save();

  return {
    status: 200,
    data: { message: "Sohbet başarıyla arşivlendi.", conversation },
  };
};

const getArchivedConversations = async (userId, { limit = 20, skip = 0 }) => {
  const [conversations, total] = await Promise.all([
    Conversation.find({ participants: userId, isActive: false })
      .populate("participants", "username profile.name profile.surname profile.avatarUrl onlineStatus lastSeenAt")
      .populate("lastMessage.senderId", "username profile.name profile.surname")
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean(),
    Conversation.countDocuments({ participants: userId, isActive: false }),
  ]);

  return {
    status: 200,
    data: { message: "Arşivlenmiş sohbetler başarıyla getirildi.", conversations, total },
  };
};

const unarchiveConversation = async (userId, conversationId) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return { status: 404, error: "Sohbet bulunamadı." };
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString(),
  );
  if (!isParticipant) {
    return { status: 403, error: "Bu işlemi yapmaya yetkiniz yok." };
  }

  if (conversation.isActive) {
    return { status: 400, error: "Bu sohbet zaten aktif." };
  }

  conversation.isActive = true;
  await conversation.save();

  return {
    status: 200,
    data: { message: "Sohbet arşivden çıkarıldı.", conversation },
  };
};

// ========================
// MESAJ İŞLEMLERİ
// ========================

const sendMessage = async (userId, conversationId, { content, messageType, fileData }) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return { status: 404, error: "Sohbet bulunamadı." };
  }

  if (!conversation.isActive) {
    return { status: 400, error: "Arşivlenmiş sohbete mesaj gönderilemez." };
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString(),
  );
  if (!isParticipant) {
    return { status: 403, error: "Bu sohbete mesaj gönderme yetkiniz yok." };
  }

  if (!content || !content.trim()) {
    return { status: 400, error: "Mesaj içeriği boş olamaz." };
  }

  if (messageType && messageType !== "text") {
    if (!fileData || !fileData.fileUrl || !fileData.fileName) {
      return { status: 400, error: "Dosya mesajları için fileData (fileUrl, fileName) gereklidir." };
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
      return { status: 403, error: "Engellediğiniz kullanıcıya mesaj gönderemezsiniz." };
    }
    if (otherUser && otherUser.blockedUsers.includes(userId)) {
      return { status: 403, error: "Bu kullanıcı tarafından engellendiniz." };
    }
  }

  const message = await Message.create({
    conversationId,
    senderId: userId,
    content,
    messageType: messageType || "text",
    fileData: messageType && messageType !== "text" ? fileData : undefined,
  });

  // lastMessage güncelle
  conversation.lastMessage = {
    content,
    senderId: userId,
    timestamp: new Date(),
  };
  await conversation.save();

  // Populate et (broadcast için gerekli)
  await message.populate("senderId", "username profile.name profile.surname profile.avatarUrl");

  // Diğer katılımcılara bildirim oluştur
  const otherParticipants = conversation.participants.filter(
    (p) => p.toString() !== userId.toString(),
  );
  await Promise.all(
    otherParticipants.map((participantId) =>
      createNotification({
        recipientId: participantId,
        senderId: userId,
        type: "message",
        referenceId: conversation._id,
        referenceModel: "Conversation",
      }).catch(() => {}),
    ),
  );

  return {
    status: 201,
    data: { message: "Mesaj başarıyla gönderildi.", data: message },
  };
};

const getMessages = async (userId, conversationId, { page = 1, limit = 50 }) => {
  page = Math.max(1, parseInt(page) || 1);
  limit = Math.max(1, parseInt(limit) || 50);
  const skip = (page - 1) * limit;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return { status: 404, error: "Sohbet bulunamadı." };
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString(),
  );
  if (!isParticipant) {
    return { status: 403, error: "Bu sohbetin mesajlarına erişim yetkiniz yok." };
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

  return {
    status: 200,
    data: {
      message: "Mesajlar başarıyla getirildi.",
      messages: messages.reverse(),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        limit,
      },
    },
  };
};

const editMessage = async (userId, messageId, content) => {
  const message = await Message.findById(messageId);

  if (!message) {
    return { status: 404, error: "Mesaj bulunamadı." };
  }

  if (message.senderId.toString() !== userId.toString()) {
    return { status: 403, error: "Sadece kendi mesajınızı düzenleyebilirsiniz." };
  }

  if (message.isDeleted) {
    return { status: 400, error: "Silinmiş mesaj düzenlenemez." };
  }

  if (message.messageType !== "text") {
    return { status: 400, error: "Sadece metin mesajları düzenlenebilir." };
  }

  if (!content || !content.trim()) {
    return { status: 400, error: "Mesaj içeriği boş olamaz." };
  }

  message.content = content;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  return {
    status: 200,
    data: {
      message: "Mesaj başarıyla düzenlendi.",
      data: message,
    },
  };
};

const deleteMessage = async (userId, messageId) => {
  const message = await Message.findById(messageId);

  if (!message) {
    return { status: 404, error: "Mesaj bulunamadı." };
  }

  if (message.senderId.toString() !== userId.toString()) {
    return { status: 403, error: "Sadece kendi mesajınızı silebilirsiniz." };
  }

  if (message.isDeleted) {
    return { status: 400, error: "Bu mesaj zaten silinmiş." };
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  await message.save();

  return {
    status: 200,
    data: { message: "Mesaj başarıyla silindi.", conversationId: message.conversationId, messageId },
  };
};

const markAsRead = async (userId, conversationId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return { status: 404, error: "Sohbet bulunamadı." };
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString(),
  );
  if (!isParticipant) {
    return { status: 403, error: "Bu işlemi yapmaya yetkiniz yok." };
  }

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

  return {
    status: 200,
    data: {
      message: `${result.modifiedCount} mesaj okundu olarak işaretlendi.`,
      modifiedCount: result.modifiedCount,
      conversationId,
    },
  };
};

const getUnreadCount = async (userId, conversationId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return { status: 404, error: "Sohbet bulunamadı." };
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString(),
  );
  if (!isParticipant) {
    return { status: 403, error: "Bu sohbete erişim yetkiniz yok." };
  }

  const unreadCount = await Message.countDocuments({
    conversationId,
    isDeleted: false,
    senderId: { $ne: userId },
    "readBy.userId": { $ne: userId },
  });

  return {
    status: 200,
    data: { conversationId, unreadCount },
  };
};

module.exports = {
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
};
