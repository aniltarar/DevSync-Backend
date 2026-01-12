const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI).then(() => {
      console.log("***MongoDB connected successfully***");
    });
  } catch (error) {
    console.error("Database connection error:", error);
  }
};
module.exports = connectDB;
