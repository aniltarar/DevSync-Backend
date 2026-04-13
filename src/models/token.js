const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    refreshToken: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

tokenSchema.index({ userId: 1 });
tokenSchema.index({ refreshToken: 1 });

module.exports = mongoose.model("Token", tokenSchema);