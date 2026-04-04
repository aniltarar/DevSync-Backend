const Conversation = require("@/models/conversation");
const chatService = require("@/services/chatService");

const chatHandler = (io, socket) => {
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
  // YAZIYOR GÖSTERGESİ
  // ========================
  socket.on("typing", ({ conversationId }) => {
    socket.activeTypingRooms?.add(conversationId);
    socket.to(conversationId).emit("userTyping", {
      userId,
      username: socket.username,
      conversationId,
    });
  });

  socket.on("stopTyping", ({ conversationId }) => {
    socket.activeTypingRooms?.delete(conversationId);
    socket.to(conversationId).emit("userStopTyping", {
      userId,
      username: socket.username,
      conversationId,
    });
  });

  // ========================
  // MESAJ GÖNDER (Socket)
  // ========================
  socket.on("sendMessage", async ({ conversationId, content, messageType, fileData }) => {
    try {
      const result = await chatService.sendMessage(userId, conversationId, {
        content,
        messageType,
        fileData,
      });

      if (result.error) {
        return socket.emit("chatError", { message: result.error });
      }

      // Odadaki herkese yeni mesajı ilet (gönderen dahil)
      io.to(conversationId).emit("newMessage", result.data.data);

      // Katılımcıların kişisel odalarına da gönder (sidebar güncellemesi için)
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        conversation.participants.forEach((pId) => {
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
    } catch (error) {
      socket.emit("chatError", { message: "Mesaj gönderilemedi.", error: error.message });
    }
  });
};

module.exports = chatHandler;
