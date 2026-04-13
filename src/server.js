require("module-alias/register");
require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const { apiLimiter } = require("@/middlewares/rateLimiter");
const logger = require("@/config/loggerConfig");

//configs import
const connectDB = require("@/config/databaseConfig");
const { swaggerSpec, swaggerUiOptions } = require("@/config/swaggerConfig");
const { initSocket } = require("@/socket/socketServer");

//routes import
const authRoutes = require("@/routes/authRoute.js");
const projectRoutes = require("@/routes/projectRoute.js");
const postRoutes = require("@/routes/postRoute.js");
const commentRoutes = require("@/routes/commentRoute.js");
const applicationRoutes = require("@/routes/applicationRoute.js");
const reportRoutes = require("@/routes/reportRoute.js");
const chatRoutes = require("@/routes/chatRoute.js");
const notificationRoutes = require("@/routes/notificationRoute.js");
const adminRoutes = require("@/routes/adminRoute.js");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  morgan("dev", {
    stream: {
      write: (msg) => logger.http(msg.trim().replace(/\x1B\[\d+m/g, "")),
    },
  }),
);
app.use(apiLimiter);
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Multer static dosya yolu
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req, res) => {
  res.send("Welcome To DevSync API!");
});

//Routes
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);
app.use("/posts", postRoutes);
app.use("/comments", commentRoutes);
app.use("/applications", applicationRoutes);
app.use("/reports", reportRoutes);
app.use("/chat", chatRoutes);
app.use("/notifications", notificationRoutes);
app.use("/admin", adminRoutes);

//Swagger
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions),
);

// Global error handler
app.use((err, req, res, _next) => {
  logger.error(`${req.method} ${req.url} — ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({ message: err.message || "Sunucu hatası." });
});

const server = http.createServer(app);
initSocket(server);

connectDB().then(() => {
  server.listen(process.env.PORT, () => {
    logger.info(`Server is running on port ${process.env.PORT}`);
  });
});
