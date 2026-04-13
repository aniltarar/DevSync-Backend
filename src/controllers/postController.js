const fs = require("fs");
const path = require("path");
const Post = require("@/models/post.js");
const Comment = require("@/models/comment.js");
const User = require("@/models/user.js");
const { createNotification } = require("@/services/notificationService");
const mongoose = require("mongoose");
const logger = require("@/config/loggerConfig");

// Create Post
const createPost = async (req, res) => {
  try {
    const { content, tags } = req.body;
    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "İçerik alanı zorunludur." });
    }
    const authorId = req.user?._id;

    const userExists = await User.exists({ _id: authorId });
    if (!userExists) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const images = req.files
      ? req.files.map((file) => ({
          url: `/uploads/images/${file.filename}`,
          originalName: file.originalname,
        }))
      : [];

    const created = await Post.create({
      authorId,
      content,
      tags: tags || [],
      images,
    });

    const { authorId: author, ...rest } = await Post.findById(created._id)
      .populate("authorId", "username  profile")
      .lean()
      .exec();

    res.status(201).json({
      message: "Gönderi başarıyla oluşturuldu.",
      post: { ...rest, author },
    });
  } catch (error) {
    res.status(500).json({
      message: "Gönderi oluşturulurken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Get All Posts
const getAllPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 100);
    const skip = (page - 1) * limit;

    // filtreler
    const filter = {};
    if (req.query.author && mongoose.Types.ObjectId.isValid(req.query.author)) {
      filter.authorId = req.query.author;
    }
    if (req.query.tag) {
      filter.tags = req.query.tag;
    }

    // basit sort parse (field veya field:asc|desc)
    const allowedFields = ["createdAt", "updatedAt", "authorId", "content"];
    let sortField = "createdAt";
    let sortOrder = -1;
    if (req.query.sortBy) {
      const [field, order] = req.query.sortBy.split(":");
      if (allowedFields.includes(field)) {
        sortField = field;
        sortOrder = order && order.toLowerCase() === "asc" ? 1 : -1;
      }
    }

    const posts = await Post.find(filter)
      .populate("authorId", "username  profile")
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const transformedPosts = posts.map(({ authorId, ...post }) => ({
      ...post,
      author: authorId,
    }));

    const total = await Post.countDocuments(filter);

    return res.status(200).json({
      message: "Gönderiler başarıyla getirildi.",
      posts: transformedPosts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        limit,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gönderiler getirilemedi.",
      error: error.message,
    });
  }
};
// Get Post By ID
const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const raw = await Post.findById(postId)
      .populate("authorId", "username  profile")
      .lean()
      .exec();
    if (!raw) {
      return res.status(404).json({ message: "Gönderi bulunamadı." });
    }

    const { authorId: author, ...rest } = raw;

    const rawComments = await Comment.find({ postId: raw._id })
      .populate("authorId", "username  profile")
      .lean()
      .exec();

    const comments = rawComments.map(({ authorId: commentAuthor, ...comment }) => ({
      ...comment,
      author: commentAuthor,
    }));

    res.status(200).json({
      post: { ...rest, author },
      comments,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gönderi getirilemedi.",
      error: error.message,
    });
  }
};

const getPostByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı ID'si." });
    }
    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 100);
    const skip = (page - 1) * limit;

    const posts = await Post.find({ authorId: userId })
      .populate("authorId", "username  profile")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const transformedPosts = posts.map(({ authorId, ...post }) => ({
      ...post,
      author: authorId,
    }));

    const total = await Post.countDocuments({ authorId: userId });

    res.status(200).json({
      message: "Kullanıcının gönderileri başarıyla getirildi.",
      posts: transformedPosts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Gönderiler getirilemedi.",
      error: error.message,
    });
  }
};

// Update Post
const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, tags, removedImageUrls } = req.body;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Gönderi bulunamadı." });
    }
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Bu gönderiyi düzenleme yetkiniz yok." });
    }

    if (content) post.content = content;
    if (tags) post.tags = tags;

    // Silinecek fotoğrafları kaldır
    if (removedImageUrls) {
      const toRemove = Array.isArray(removedImageUrls)
        ? removedImageUrls
        : [removedImageUrls];

      post.images = post.images.filter((img) => !toRemove.includes(img.url));

      for (const url of toRemove) {
        const filePath = path.join(__dirname, "..", "..", url);
        fs.unlink(filePath, () => {});
      }
    }

    // Yeni fotoğrafları ekle
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => ({
        url: `/uploads/images/${file.filename}`,
        originalName: file.originalname,
      }));
      post.images.push(...newImages);
    }

    await post.save();

    const { authorId: author, ...rest } = await Post.findById(post._id)
      .populate("authorId", "username  profile")
      .lean()
      .exec();

    res.status(200).json({
      message: "Gönderi başarıyla güncellendi.",
      post: { ...rest, author },
    });
  } catch (error) {
    res.status(500).json({
      message: "Gönderi güncellenirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Delete Post
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Gönderi bulunamadı." });
    }
    const isOwner = post.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Bu gönderiyi silme yetkiniz yok." });
    }
    await post.deleteOne();
    res.status(200).json({
      message: "Gönderi başarıyla silindi.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gönderi silinirken bir hata oluştu.",
      error: error.message,
    });
  }
};

const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Gönderi bulunamadı." });
    }

    const alreadyLiked = post.engagement.likes.includes(userId);
    if (alreadyLiked) {
      post.engagement.likes.pull(userId);
      await post.save();
      return res
        .status(200)
        .json({
          message: "Gönderi beğenisi kaldırıldı.",
          content: post.content,
        });
    } else {
      post.engagement.likes.push(userId);
      await post.save();

      // Post sahibine "like_post" bildirimi
      createNotification({
        recipientId: post.authorId,
        senderId: userId,
        type: "like_post",
        referenceId: post._id,
        referenceModel: "Post",
      }).catch((err) => logger.warn("like_post bildirimi gönderilemedi.", { error: err.message }));

      return res
        .status(200)
        .json({ message: "Gönderi beğenildi.", content: post.content });
    }
  } catch (error) {
    res.status(500).json({
      message: "Gönderi beğenilirken bir hata oluştu.",
      error: error.message,
    });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  getPostByUserId,
};
