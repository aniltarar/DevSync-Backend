const rateLimit = require("express-rate-limit");

// Genel API limiti — tüm route'lara uygulanır
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin." },
});

// Login / token-refresh — brute-force koruması
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin." },
});

// Register — spam hesap koruması
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Çok fazla kayıt denemesi. Lütfen 1 saat sonra tekrar deneyin." },
});

module.exports = { apiLimiter, authLimiter, registerLimiter };
