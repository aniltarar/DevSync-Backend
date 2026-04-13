const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "like_post",
        "like_comment",
        "comment",
        "reply",
        "follow",
        "new_application",
        "application_update",
        "project_invite",
        "message",
      ],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    referenceModel: {
      type: String,
      required: true,
      enum: ["Post", "Comment", "Application", "Project", "User", "Conversation"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// recipientId zaten field-level index var; compound index okunmamış filtreleme için
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
