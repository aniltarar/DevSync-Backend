require("module-alias/register");
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
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

//configs import
dotenv.config();
const connectDB = require("@/config/databaseConfig");
const { swaggerSpec, swaggerUiOptions } = require("@/config/swaggerConfig");

const app = express();

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
  res.send("Welcome To API!");
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

//Swagger
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions),
);

const server = http.createServer(app);
initSocket(server);

connectDB().then(() => {
  server.listen(process.env.PORT, () => {
    console.log(`***Server is running on port ${process.env.PORT}***`);
  });
});
