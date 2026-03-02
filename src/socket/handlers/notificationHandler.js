const { markAsRead, markAllAsRead } = require("@/services/notificationService");

const notificationHandler = (io, socket) => {
  const userId = socket.userId;

  // ========================
  // TEK BİLDİRİM OKUNDU
  // ========================
  socket.on("markNotificationRead", async (notificationId) => {
    try {
      const notification = await markAsRead(notificationId, userId);

      if (!notification) {
        return socket.emit("notificationError", { message: "Bildirim bulunamadı." });
      }

      socket.emit("notificationRead", { notificationId });
    } catch (error) {
      socket.emit("notificationError", { message: "Bildirim güncellenirken hata oluştu.", error: error.message });
    }
  });

  // ========================
  // TÜMÜNÜ OKUNDU İŞARETLE
  // ========================
  socket.on("markAllNotificationsRead", async () => {
    try {
      const count = await markAllAsRead(userId);
      socket.emit("allNotificationsRead", { count });
    } catch (error) {
      socket.emit("notificationError", { message: "Bildirimler güncellenirken hata oluştu.", error: error.message });
    }
  });
};

module.exports = notificationHandler;
