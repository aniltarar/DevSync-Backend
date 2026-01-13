const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minLength: 3,
      maxLength: 30,
    },
    profile: {
      name: {
        type: String,
        required: true,
        trim: true,
        minLength: 2,
        maxLength: 30,
      },
      surname: {
        type: String,
        required: true,
        trim: true,
        minLength: 2,
        maxLength: 30,
      },
      bio: {
        type: String,
        trim: true,
        maxLength: 160,
        default: "",
      },
      avatarUrl: {
        type: String,
        trim: true,
        default: "",
      },
      location: {
        type: String,
        trim: true,
        default: "",
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    socialLinks: {
      github: { type: String, trim: true, default: "" },
      linkedin: { type: String, trim: true, default: "" },
      portfolio: { type: String, trim: true, default: "" },
    },
    titles:{
      type: [String],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);