const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

const { combine, timestamp, printf, colorize, errors } = format;

const logsDir = path.join(__dirname, "..", "..", "logs");

// Log satır formatı
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Konsol — sadece development'ta renkli
    new transports.Console({
      format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), logFormat),
      silent: process.env.NODE_ENV === "test",
    }),

    // Tüm loglar — günlük rotate
    new DailyRotateFile({
      dirname: logsDir,
      filename: "app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d", // 14 gün tut
      level: "debug",
    }),

    // Sadece error logları ayrı dosyada
    new DailyRotateFile({
      dirname: logsDir,
      filename: "error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d", // 30 gün tut
      level: "error",
    }),
  ],
});

module.exports = logger;
