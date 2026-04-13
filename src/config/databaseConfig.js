const mongoose = require("mongoose");
const logger = require("@/config/loggerConfig");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI).then(() => {
      logger.info("MongoDB connected successfully");
    });
  } catch (error) {
    logger.error("Database connection error", { stack: error.stack });
    process.exit(1);
  }
};
module.exports = connectDB;
