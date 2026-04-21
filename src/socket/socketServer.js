const { Server } = require("socket.io");
const User = require("@/models/user");
const socketAuthMiddleware = require("@/middlewares/socketAuthMiddleware");
const chatHandler = require("@/socket/handlers/chatHandler");
const notificationHandler = require("@/socket/handlers/notificationHandler");

// io instance — controller'lardan erişim için
let io = null;

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO henüz başlatılmadı.");
  }
  return io;
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
    pingInterval: 25000, // 25s'de bir ping gönder
    pingTimeout: 20000,  // 20s cevap gelmezse bağlantıyı kes
  });

  // ========================
  // SOCKET MIDDLEWARE: Token doğrulama
  // ========================
  io.use(socketAuthMiddleware);

  // ========================
  // BAĞLANTI YÖNETİMİ
  // ========================
  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] Kullanıcı bağlandı: User ID => ${userId}  Socket ID => ${socket.id}`);

    // Kullanıcıyı online yap + username'i socket'a kaydet
    const user = await User.findByIdAndUpdate(
      userId,
      { onlineStatus: "online" },
      { new: true },
    );
    socket.username = user?.username || userId;

    // Herkese bu kullanıcının online olduğunu bildir
    socket.broadcast.emit("userOnline", {
      userId,
      username: socket.username,
    });

    // Kullanıcının kişisel bildirim odasına katıl
    socket.join(`user:${userId}`);

    // Mevcut online kullanıcı listesini yeni bağlanan socket'a gönder
    const onlineSockets = await io.fetchSockets();
    const onlineUsers = [];
    const seen = new Set();
    for (const s of onlineSockets) {
      if (s.userId && !seen.has(s.userId)) {
        seen.add(s.userId);
        onlineUsers.push({ userId: s.userId, username: s.username || s.userId });
      }
    }
    socket.emit("onlineUsers", onlineUsers);

    // Aktif typing olan conversation'ları takip et
    socket.activeTypingRooms = new Set();

    // Handler'ları kaydet
    chatHandler(io, socket);
    notificationHandler(io, socket);

    // ========================
    // BAĞLANTI KESİLMESİ
    // ========================
    socket.on("disconnect", async () => {
      console.log(`[Socket] Kullanıcı ayrıldı: ${userId} (${socket.id})`);

      // Yazıyor göstergesi temizleme — bağlantı koptuğunda aktif odalara stopTyping gönder
      if (socket.activeTypingRooms?.size > 0) {
        socket.activeTypingRooms.forEach((conversationId) => {
          socket.to(conversationId).emit("userStopTyping", {
            userId,
            username: socket.username,
            conversationId,
          });
        });
        socket.activeTypingRooms.clear();
      }

      const lastSeenAt = new Date();
      await User.findByIdAndUpdate(userId, {
        onlineStatus: "offline",
        lastSeenAt,
      });

      socket.broadcast.emit("userOffline", {
        userId,
        username: socket.username,
        lastSeenAt,
      });
    });
  });

  return io;
};

module.exports = { initSocket, getIO };
