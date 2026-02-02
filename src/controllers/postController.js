const Post = require("@/models/post.js");
const Comment = require("@/models/comment.js");
const User = require("@/models/user.js");
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
    const post = await Post.findById(postId).populate(
      "authorId",
      "username email",
    );
    if (!post) {
      return res.status(404).json({
        message: "Gönderi bulunamadı.",
      });
    }
    // İlgili postun yorumlarını çek
    const comments = await Comment.find({ postId: post._id }).populate(
      "authorId",
      "username email",
    );
    res.status(200).json({
      ...post.toObject(),
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
    const posts = await Post.find({ authorId: userId })
      .populate("authorId", "username email profile")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const transformedPosts = posts.map(({ authorId, ...post }) => ({
      ...post,
      author: authorId,
    }));
    res.status(200).json({
      count: transformedPosts.length,
      message: "Kullanıcının gönderileri başarıyla getirildi.",
      posts: transformedPosts,
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
      return res.status(200).json({ message: "Gönderi beğenisi kaldırıldı.", content: post.content });
    } else {
      post.engagement.likes.push(userId);
      await post.save();
      return res.status(200).json({ message: "Gönderi beğenildi.",content:post.content });
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