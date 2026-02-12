const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportType: {
      type: String,
      enum: [
        "post",
        "comment",
        "project",
        "user",
        "chat",
        "application",
        "other",
      ],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      required: [true, "Rapor nedeni gereklidir."],
      enum: ["spam", "abuse", "harassment", "inappropriate content", "other"],
    },
    description: {
      type: String,
      trim: true,
      maxLength: [1000, "Açıklama en fazla 1000 karakter olabilir."],
    },
    status: {
      isResolved: {
        type: Boolean,
        default: false,
      },
      state: {
        type: String,
        enum: ["pending", "resolved", "rejected", "cancelled"],
        default: "pending",
      },
      resolvedAt: {
        type: Date,
      },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      actionTaken: {
        type: String,
        enum: ["none", "warning", "suspension", "ban", "content removal"],
        default: "none",
      },
      adminNote: {
        type: String,
        trim: true,
        maxLength: [1000, "Admin notu en fazla 1000 karakter olabilir."],
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Report", reportSchema);
