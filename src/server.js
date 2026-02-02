require("module-alias/register");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");

//routes import
const authRoutes = require("@/routes/authRoute.js");
const projectRoutes = require("@/routes/projectRoute.js");
const postRoutes = require("@/routes/postRoute.js");
const commentRoutes = require("@/routes/commentRoute.js");

//configs import
dotenv.config();
const connectDB = require("@/config/databaseConfig");
const { swaggerSpec, swaggerUiOptions } = require("@/config/swaggerConfig");

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Welcome To API!");
});

//Routes
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);
app.use("/posts", postRoutes);
app.use("/comments", commentRoutes);

//Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec,swaggerUiOptions));

connectDB().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`***Server is running on port ${process.env.PORT}***`);
  });
});
