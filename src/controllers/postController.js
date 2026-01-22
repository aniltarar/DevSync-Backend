const Post = require("@/models/post.js");
const mongoose = require("mongoose");

// Create Post
const createPost = async (req, res) => {
  try {
    const { content, tags } = req.body;
    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "İçerik alanı zorunludur." });
    }
    const authorId = req.user?._id;
    const post = await Post.create({
      authorId,
      content,
      tags: tags || [],
    });
    res.status(201).json({
      message: "Gönderi başarıyla oluşturuldu.",
      post,
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
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
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
      .populate("authorId", "username email profile")
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(filter);

    return res.status(200).json({
      message: "Gönderiler başarıyla getirildi.",
      posts,
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
    const post = await Post.findById(postId).populate(
      "authorId",
      "username email",
    );
    if (!post) {
      return res.status(404).json({
        message: "Gönderi bulunamadı.",
      });
    }
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({
      message: "Gönderi getirilemedi.",
      error: error.message,
    });
  }
};

// Update Post
const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, tags } = req.body;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: "Gönderi bulunamadı.",
      });
    }
    if (content) post.content = content;
    if (tags) post.tags = tags;
    await post.save();
    res.status(200).json({
      message: "Gönderi başarıyla güncellendi.",
      post,
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
    const post = await Post.findByIdAndDelete(postId);
    if (!post) {
      return res.status(404).json({
        message: "Gönderi bulunamadı.",
      });
    }
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

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
};
