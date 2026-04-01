const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const socketAuthMiddleware = (socket, next) => {
  const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
  const token =
    cookies.accessToken ||
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
