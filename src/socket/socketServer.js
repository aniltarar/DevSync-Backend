const { Server } = require("socket.io");
const User = require("@/models/user");
const socketAuthMiddleware = require("@/middlewares/socketAuthMiddleware");
const chatHandler = require("@/socket/handlers/chatHandler");

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

    // Chat handler'larını kaydet
    chatHandler(io, socket);

    // ========================
    // BAĞLANTI KESİLMESİ
    // ========================
    socket.on("disconnect", async () => {
      console.log(`[Socket] Kullanıcı ayrıldı: ${userId} (${socket.id})`);

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
