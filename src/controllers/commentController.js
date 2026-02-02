const Comment = require("@/models/comment.js");
const Post = require("@/models/post.js");

const mongoose = require("mongoose");

// Create Comment
const createComment = async (req, res) => {
  try {
    const { postId, content, parentCommentId } = req.body;
    const authorId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: "Yorum yapılacak gönderi bulunamadı.",
      });
    }

    // Yeni yorumun oluşturulması ve post içerisinde engagement güncellemesi

    const comment = await Comment.create({
      postId,
      authorId,
      content,
      parentCommentId: parentCommentId || null,
    });

    post.engagement.commentsCount += 1;
    await post.save();

    res.status(201).json({
      message: "Yorum başarıyla oluşturuldu.",
      comment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Yorum oluşturulurken bir hata oluştu.",
      error: error.message,
    });
  }
};

const getCommentsByPostId = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Geçersiz gönderi ID'si." });
    }
    const postExists = await Post.exists({ _id: postId });
    if (!postExists) {
      return res.status(404).json({ message: "Gönderi bulunamadı." });
    }
    const comments = await Comment.find({ postId: postId })
      .populate("authorId", "username email profile")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const transformedComments = comments.map(({ authorId, ...comment }) => ({
      ...comment,
      author: authorId,
    }));
    res.status(200).json(transformedComments);
  } catch (error) {
    res.status(500).json({
      message: "Yorumlar getirilemedi.",
      error: error.message,
    });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const authorId = req.user._id;

    const comment = await Comment.findOneAndDelete({
      _id: commentId,
      authorId: authorId,
    });
    if (!comment) {
      return res
        .status(404)
        .json({ message: "Yorum bulunamadı veya yetkiniz yok." });
    }

    // Post'un yorum sayısını azalt
    const post = await Post.findById(comment.postId);
    if (post && post.engagement.commentsCount > 0) {
      post.engagement.commentsCount -= 1;
      await post.save();
    }

    res.status(200).json({ message: "Yorum başarıyla silindi." });
  } catch (error) {
    res.status(500).json({
      message: "Yorum silinirken bir hata oluştu.",
      error: error.message,
    });
  }
};

const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const authorId = req.user._id;

    const comment = await Comment.findOne({
      _id: commentId,
      authorId: authorId,
    });
    if (!comment) {
      return res
        .status(404)
        .json({ message: "Yorum bulunamadı veya yetkiniz yok." });
    }
    comment.content = content || comment.content;
    await comment.save();
    res.status(200).json({
      message: "Yorum başarıyla güncellendi.",
      comment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Yorum güncellenirken bir hata oluştu.",
      error: error.message,
    });
  }
};

const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Yorum bulunamadı." });
    }

    const alreadyLiked = comment.likes.includes(userId);
    if (alreadyLiked) {
      // Beğeniyi kaldır
      comment.likes.pull(userId);
      await comment.save();
      return res.status(200).json({ message: "Yorumun beğenisi kaldırıldı." });
    } else {
      // Beğeniyi ekle
      comment.likes.push(userId);
      await comment.save();
      return res.status(200).json({ message: "Yorum beğenildi." });
    }
  } catch (error) {
    res.status(500).json({
      message: "Yorum beğenilirken bir hata oluştu.",
      error: error.message,
    });
  }
};

module.exports = {
  createComment,
  getCommentsByPostId,
  deleteComment,
  updateComment,
  likeComment,
};
