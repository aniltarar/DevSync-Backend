const Conversation = require("@/models/conversation");
const Message = require("@/models/message");
const User = require("@/models/user");

const chatHandler = (io, socket ) => {
  const userId = socket.userId;

  // ========================
  // SOHBET ODASINA KATIL
  // ========================
  socket.on("joinConversation", async (conversationId) => {
    try {
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return socket.emit("chatError", { message: "Sohbet bulunamadı." });
      }

      const isParticipant = conversation.participants.some(
        (p) => p.toString() === userId.toString(),
      );
      if (!isParticipant) {
        return socket.emit("chatError", { message: "Bu sohbete erişim yetkiniz yok." });
      }

      socket.join(conversationId);
      console.log(`[Socket] ${userId} → odaya katıldı: ${conversationId}`);
    } catch (error) {
      socket.emit("chatError", { message: "Odaya katılırken hata oluştu.", error: error.message });
    }
  });

  // ========================
  // SOHBET ODASINDAN AYRIL
  // ========================
  socket.on("leaveConversation", (conversationId) => {
    socket.leave(conversationId);
    console.log(`[Socket] ${userId} → odadan ayrıldı: ${conversationId}`);
  });

  // ========================
  // MESAJ GÖNDER
  // ========================
  socket.on("sendMessage", async ({ conversationId, content, messageType, fileData }) => {
    try {
      // Sohbet kontrolü
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return socket.emit("chatError", { message: "Sohbet bulunamadı." });
      }

      if (!conversation.isActive) {
        return socket.emit("chatError", { message: "Arşivlenmiş sohbete mesaj gönderilemez." });
      }

      // Katılımcı kontrolü
      const isParticipant = conversation.participants.some(
        (p) => p.toString() === userId.toString(),
      );
      if (!isParticipant) {
        return socket.emit("chatError", { message: "Bu sohbete mesaj gönderme yetkiniz yok." });
      }

      // Content kontrolü
      if (!content || !content.trim()) {
        return socket.emit("chatError", { message: "Mesaj içeriği boş olamaz." });
      }

      // fileData validasyonu
      if (messageType && messageType !== "text") {
        if (!fileData || !fileData.fileUrl || !fileData.fileName) {
          return socket.emit("chatError", {
            message: "Dosya mesajları için fileData (fileUrl, fileName) gereklidir.",
          });
        }
      }

      // Block kontrolü (direct sohbet)
      if (conversation.conversationType === "direct") {
        const currentUser = await User.findById(userId);
        const otherParticipantId = conversation.participants.find(
          (p) => p.toString() !== userId.toString(),
        );
        const otherUser = await User.findById(otherParticipantId);

        if (currentUser.blockedUsers.includes(otherParticipantId)) {
          return socket.emit("chatError", { message: "Engellediğiniz kullanıcıya mesaj gönderemezsiniz." });
        }
        if (otherUser && otherUser.blockedUsers.includes(userId)) {
          return socket.emit("chatError", { message: "Bu kullanıcı tarafından engellendiniz." });
        }
      }

      // Mesajı DB'ye kaydet
      const message = new Message({
        conversationId,
        senderId: userId,
        content,
        messageType: messageType || "text",
        fileData: messageType && messageType !== "text" ? fileData : undefined,
      });
      await message.save();

      // lastMessage güncelle
      conversation.lastMessage = { content, senderId: userId, timestamp: new Date() };
      await conversation.save();

      // Mesajı populate et (senderId bilgileriyle)
      await message.populate("senderId", "username profile.name profile.surname profile.avatarUrl");

      // Odadaki herkese ilet (gönderen dahil)
      io.to(conversationId).emit("newMessage", message);
    } catch (error) {
      socket.emit("chatError", { message: "Mesaj gönderilemedi.", error: error.message });
    }
  });

  // ========================
  // MESAJ DÜZENLE
  // ========================
  socket.on("editMessage", async ({ messageId, content }) => {
    try {
      const message = await Message.findById(messageId);

      if (!message) {
        return socket.emit("chatError", { message: "Mesaj bulunamadı." });
      }
      if (message.senderId.toString() !== userId.toString()) {
        return socket.emit("chatError", { message: "Sadece kendi mesajınızı düzenleyebilirsiniz." });
      }
      if (message.isDeleted) {
        return socket.emit("chatError", { message: "Silinmiş mesaj düzenlenemez." });
      }
      if (message.messageType !== "text") {
        return socket.emit("chatError", { message: "Sadece metin mesajları düzenlenebilir." });
      }
      if (!content || !content.trim()) {
        return socket.emit("chatError", { message: "Mesaj içeriği boş olamaz." });
      }

      message.content = content;
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      // Odadaki herkese bildir
      io.to(message.conversationId.toString()).emit("messageEdited", {
        messageId,
        content,
        editedAt: message.editedAt,
      });
    } catch (error) {
      socket.emit("chatError", { message: "Mesaj düzenlenemedi.", error: error.message });
    }
  });

  // ========================
  // MESAJ SİL
  // ========================
  socket.on("deleteMessage", async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);

      if (!message) {
        return socket.emit("chatError", { message: "Mesaj bulunamadı." });
      }
      if (message.senderId.toString() !== userId.toString()) {
        return socket.emit("chatError", { message: "Sadece kendi mesajınızı silebilirsiniz." });
      }
      if (message.isDeleted) {
        return socket.emit("chatError", { message: "Bu mesaj zaten silinmiş." });
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      // Odadaki herkese bildir
      io.to(message.conversationId.toString()).emit("messageDeleted", { messageId });
    } catch (error) {
      socket.emit("chatError", { message: "Mesaj silinemedi.", error: error.message });
    }
  });

  // ========================
  // MESAJLARI OKUNDU İŞARETLE
  // ========================
  socket.on("markAsRead", async ({ conversationId }) => {
    try {
      const result = await Message.updateMany(
        {
          conversationId,
          isDeleted: false,
          senderId: { $ne: userId },
          readBy: { $not: { $elemMatch: { userId } } },
        },
        { $push: { readBy: { userId, readAt: new Date() } } },
      );

      // Odadaki diğer kullanıcılara bildir
      socket.to(conversationId).emit("messagesRead", {
        conversationId,
        userId,
        readCount: result.modifiedCount,
      });
    } catch (error) {
      socket.emit("chatError", { message: "Okundu işaretlenemedi.", error: error.message });
    }
  });

  // ========================
  // YAZIYOR GÖSTERGESİ
  // ========================
  socket.on("typing", ({ conversationId }) => {
    socket.to(conversationId).emit("userTyping", { userId, conversationId });
  });

  socket.on("stopTyping", ({ conversationId }) => {
    socket.to(conversationId).emit("userStopTyping", { userId, conversationId });
  });
};

module.exports = chatHandler;
