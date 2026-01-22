const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "İçerik gereklidir."],
      trim: true,
      minLength: [1, "İçerik en az 1 karakter olmalıdır."],
      maxLength: [2000, "İçerik en fazla 2000 karakter olabilir."],
    },
    tags: {
      type: [String],
      default: [],
    },
    engagement: {
      likes: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      commentsCount: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Post", postSchema);
