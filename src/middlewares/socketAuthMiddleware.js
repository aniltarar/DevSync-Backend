const jwt = require("jsonwebtoken");

const socketAuthMiddleware = (socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(" ")[1];

  if (!token) {
    return next(new Error("Socket Token bulunamadı."));
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    socket.userId = decoded._id;
    next();
  } catch {
    return next(new Error("Geçersiz veya süresi dolmuş Socket Token."));
  }
};

module.exports = socketAuthMiddleware;
