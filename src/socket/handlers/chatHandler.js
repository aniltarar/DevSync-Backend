const Conversation = require("@/models/conversation");

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
    socket.to(conversationId).emit("userTyping", {
      userId,
      username: socket.username,
      conversationId,
    });
  });

  socket.on("stopTyping", ({ conversationId }) => {
    socket.to(conversationId).emit("userStopTyping", {
      userId,
      username: socket.username,
      conversationId,
    });
  });
};

module.exports = chatHandler;
