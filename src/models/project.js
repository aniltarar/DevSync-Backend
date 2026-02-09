const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 100,
    },
    description: {
      type: String,
      trim: true,
      minLength: 20,
      maxLength: 500,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "active", "closed", "rejected"],
      default: "draft",
    },
    projectType: {
      type: String,
      enum: ["personal", "team", "open-source", "freelance"],
      default: "personal",
    },
    category: {
      type: String,
      required: true,
      enum: ["web", "mobile", "desktop", "ai", "game", "devops", "other"],
    },
    slots: [
      {
        roleName: {
          type: String,
          required: true,
          trim: true,
        },
        requiredSkills: {
          type: [String],
          required: true,
        },
        optionalSkills: {
          type: [String],
        },
        quota: {
          type: Number,
          required: true,
          min: 1,
        },
        status: {
          type: String,
          enum: ["open", "filled"],
          default: "open",
        },
        filledBy: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Project", projectSchema);
