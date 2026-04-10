const User = require("@/models/user");
const Post = require("@/models/post");
const Comment = require("@/models/comment");
const Project = require("@/models/project");
const Report = require("@/models/report");
const mongoose = require("mongoose");

// Dashboard İstatistikleri
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalPosts,
      totalProjects,
      totalComments,
      pendingReports,
      recentUsers,
      recentReports,
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Project.countDocuments(),
      Comment.countDocuments(),
      Report.countDocuments({ "status.state": "pending" }),
      User.find()
        .select("username profile.name profile.surname profile.avatarUrl role status createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Report.find()
        .populate("reporterId", "username profile.avatarUrl")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return res.status(200).json({
      stats: {
        totalUsers,
        totalPosts,
        totalProjects,
        totalComments,
        pendingReports,
      },
      recentUsers,
      recentReports,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Dashboard istatistikleri alınırken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Tüm Kullanıcıları Listele
const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      filter.$or = [
        { username: searchRegex },
        { email: searchRegex },
        { "profile.name": searchRegex },
        { "profile.surname": searchRegex },
      ];
    }

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.status !== undefined) {
      filter.status = req.query.status === "true";
    }

    const sortMap = { newest: { createdAt: -1 }, oldest: { createdAt: 1 } };
    const sort = sortMap[req.query.sortBy] || { createdAt: -1 };

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("username email profile role status onlineStatus createdAt")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      users,
      pagination: {
        currentPage: page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Kullanıcılar getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Kullanıcı Detayı
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı ID'si." });
    }

    const user = await User.findById(userId)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const [postCount, projectCount, commentCount, reportCount] = await Promise.all([
      Post.countDocuments({ authorId: userId }),
      Project.countDocuments({ ownerId: userId }),
      Comment.countDocuments({ authorId: userId }),
      Report.countDocuments({ reporterId: userId }),
    ]);

    return res.status(200).json({
      user,
      statistics: { postCount, projectCount, commentCount, reportCount },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Kullanıcı bilgileri getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Kullanıcı Durumunu Değiştir (Ban/Unban)
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı ID'si." });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Kendi hesabınızı değiştiremezsiniz." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({
      message: status ? "Kullanıcı aktif edildi." : "Kullanıcı banlandı.",
      user: { _id: user._id, username: user.username, status: user.status },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Kullanıcı durumu güncellenirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Kullanıcı Rolünü Değiştir
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı ID'si." });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Kendi rolünüzü değiştiremezsiniz." });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Geçersiz rol." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      message: `Kullanıcı rolü '${role}' olarak güncellendi.`,
      user: { _id: user._id, username: user.username, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Kullanıcı rolü güncellenirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Tüm Gönderileri Listele
const getAllPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.search) {
      filter.content = new RegExp(req.query.search, "i");
    }

    const sortMap = { newest: { createdAt: -1 }, oldest: { createdAt: 1 } };
    const sort = sortMap[req.query.sortBy] || { createdAt: -1 };

    const [posts, totalPosts] = await Promise.all([
      Post.find(filter)
        .populate("authorId", "username profile.avatarUrl")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(filter),
    ]);

    const transformedPosts = posts.map(({ authorId, ...post }) => ({
      ...post,
      author: authorId,
    }));

    return res.status(200).json({
      posts: transformedPosts,
      pagination: {
        currentPage: page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gönderiler getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Gönderi Sil (Admin)
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Geçersiz gönderi ID'si." });
    }

    const post = await Post.findByIdAndDelete(postId);
    if (!post) {
      return res.status(404).json({ message: "Gönderi bulunamadı." });
    }

    await Comment.deleteMany({ postId });

    return res.status(200).json({ message: "Gönderi ve yorumları silindi." });
  } catch (error) {
    return res.status(500).json({
      message: "Gönderi silinirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Tüm Projeleri Listele
const getAllProjects = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.search) {
      filter.title = new RegExp(req.query.search, "i");
    }

    const [projects, totalProjects] = await Promise.all([
      Project.find(filter)
        .populate("ownerId", "username profile.avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(filter),
    ]);

    return res.status(200).json({
      projects,
      pagination: {
        currentPage: page,
        limit,
        totalProjects,
        totalPages: Math.ceil(totalProjects / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Projeler getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Proje Durumunu Güncelle
const updateProjectStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Geçersiz proje ID'si." });
    }

    const validStatuses = ["draft", "pending", "active", "closed", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Geçersiz proje durumu." });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Proje bulunamadı." });
    }

    project.status = status;
    await project.save();

    return res.status(200).json({
      message: `Proje durumu '${status}' olarak güncellendi.`,
      project: { _id: project._id, title: project.title, status: project.status },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Proje durumu güncellenirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Tüm Yorumları Listele
const getAllComments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.search) {
      filter.content = new RegExp(req.query.search, "i");
    }

    const sortMap = { newest: { createdAt: -1 }, oldest: { createdAt: 1 } };
    const sort = sortMap[req.query.sortBy] || { createdAt: -1 };

    const [comments, totalComments] = await Promise.all([
      Comment.find(filter)
        .populate("authorId", "username profile.avatarUrl")
        .populate("postId", "content")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments(filter),
    ]);

    const transformedComments = comments.map(({ authorId, ...comment }) => ({
      ...comment,
      author: authorId,
    }));

    return res.status(200).json({
      comments: transformedComments,
      pagination: {
        currentPage: page,
        limit,
        totalComments,
        totalPages: Math.ceil(totalComments / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Yorumlar getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Yorum Sil (Admin)
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Geçersiz yorum ID'si." });
    }

    const comment = await Comment.findByIdAndDelete(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Yorum bulunamadı." });
    }

    // Child comment'ları sil
    const { deletedCount } = await Comment.deleteMany({ parentCommentId: commentId });

    // Post'un yorum sayısını güncelle
    const totalDeleted = 1 + deletedCount;
    const post = await Post.findById(comment.postId);
    if (post && post.engagement.commentsCount > 0) {
      post.engagement.commentsCount = Math.max(0, post.engagement.commentsCount - totalDeleted);
      await post.save();
    }

    return res.status(200).json({ message: "Yorum ve alt yorumları silindi." });
  } catch (error) {
    return res.status(500).json({
      message: "Yorum silinirken bir hata oluştu.",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getAllPosts,
  deletePost,
  getAllProjects,
  updateProjectStatus,
  getAllComments,
  deleteComment,
};
