const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    conversationType: {
      type: String,
      enum: ["direct", "group", "project"],
      default: "direct",
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    title: {
      type: String,
      trim: true,
      maxLength: 100,
      minLength: 2,
    },
    lastMessage: {
      content: String,
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      timestamp: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, isActive: 1, updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);