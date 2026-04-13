const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    slotId:{
      type: mongoose.Schema.Types.ObjectId, // slots içindeki _id
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roleName: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      maxLength: 1000,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected","cancelled"],
      default: "pending",
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

applicationSchema.index({ projectId: 1, status: 1 });
applicationSchema.index({ userId: 1, createdAt: -1 });
applicationSchema.index({ projectId: 1, userId: 1, slotId: 1 });

module.exports = mongoose.model("Application", applicationSchema);