require("module-alias/register");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

const connectDB = require("@/config/databaseConfig");
const authRoutes = require("@/routes/authRoute");

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Welcome To API!");
});

app.use("/auth", authRoutes);

connectDB().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`***Server is running on port ${process.env.PORT}***`);
  });
});
