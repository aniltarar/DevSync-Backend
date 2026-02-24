const { Server } = require("socket.io");
const User = require("@/models/user");
const socketAuthMiddleware = require("@/middlewares/socketAuthMiddleware");
const chatHandler = require("@/socket/handlers/chatHandler");

// userId → socketId haritası (bellekte tutulur)
const onlineUsers = new Map();

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
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
    console.log(`[Socket] Kullanıcı bağlandı: User ID => ${userId}  Socket ID => ${socket.id}ß`);

    // Online listesine ekle
    onlineUsers.set(userId, socket.id);

    // Kullanıcıyı online yap
    await User.findByIdAndUpdate(userId, { onlineStatus: "online" });

    // Herkese bu kullanıcının online olduğunu bildir
    socket.broadcast.emit("userOnline", { userId });

    // Chat handler'larını kaydet
    chatHandler(io, socket, onlineUsers);

    // ========================
    // BAĞLANTI KESİLMESİ
    // ========================
    socket.on("disconnect", async () => {
      console.log(`[Socket] Kullanıcı ayrıldı: ${userId} (${socket.id})`);

      onlineUsers.delete(userId);

      await User.findByIdAndUpdate(userId, { onlineStatus: "offline" });

      socket.broadcast.emit("userOffline", { userId });
    });
  });

  return io;
};

module.exports = { initSocket, onlineUsers };
