const Report = require("@/models/report.js");
const mongoose = require("mongoose");

const Post = require("@/models/post");
const Comment = require("@/models/comment");
const Project = require("@/models/project");
const User = require("@/models/user");
const Application = require("@/models/application");

const modelMap = {
  post: Post,
  comment: Comment,
  project: Project,
  user: User,
  application: Application,
};

// Create Report
const createReport = async (req, res) => {
  try {
    const { reportType, contentId, reason, description } = req.body;
    const reporterId = req.user._id;

    if (!reporterId)
      return res.status(401).json({ message: "Kullanıcı doğrulanmadı." });

    const allowedTypes = [
      "post",
      "comment",
      "project",
      "user",
      "chat",
      "application",
      "other",
    ];
    if (!reportType || !allowedTypes.includes(reportType)) {
      return res.status(400).json({
        message:
          "Geçersiz rapor türü. Örnek rapor türleri: post, comment, project, user, chat, application, other",
      });
    }

    if (reportType !== "other" && reportType !== "chat") {
      if (!contentId)
        return res.status(400).json({ message: "contentId gerekli." });
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return res.status(400).json({ message: "Geçersiz içerik ID'si." });
      }

      // Reason enum kontrolü
      const allowedReasons = [
        "spam",
        "abuse",
        "harassment",
        "inappropriate content",
        "other",
      ];
      if (!reason || !allowedReasons.includes(reason)) {
        return res.status(400).json({
          message:
            "Geçersiz rapor nedeni. Örnek nedenler: spam, abuse, harassment, inappropriate content, other",
        });
      }

      const Model = modelMap[reportType];
      if (Model) {
        const exists = await Model.exists({ _id: contentId });
        if (!exists)
          return res
            .status(404)
            .json({ message: "Raporlanan içerik bulunamadı." });
      }
    }

    const already = await Report.findOne({ reporterId, reportType, contentId });
    if (already) {
      return res
        .status(409)
        .json({ message: "Zaten bu içeriği rapor ettiniz." });
    }

    const report = await Report.create({
      reporterId,
      reportType,
      contentId,
      reason,
      description,
    });
    return res.status(201).json({ message: "Rapor oluşturuldu.", report });
  } catch (error) {
    return res.status(500).json({
      message: "Rapor oluşturulurken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Get My Reports
const getMyReports = async (req, res) => {
  try {
    const reporterId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter = { reporterId };
    if (req.query.reportType) {
      filter.reportType = req.query.reportType;
    }

    const reports = await Report.find(filter)
      .populate("reporterId", "username email")
      .populate("contentId", "title description")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReports = await Report.countDocuments(filter);

    return res.status(200).json({
      reports,
      totalReports,
      page,
      limit,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Raporlar getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Get Report By Report ID (Admin veya Rapor Sahibi)
const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user._id;
    const role = req.user.role;
    if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: "Geçersiz reportId." });
    }
    const report = await Report.findById(reportId).populate(
      "reporterId",
      "profile.name profile.surname email role",
    );
    if (!report) {
      return res.status(404).json({ message: "Rapor bulunamadı." });
    }
    // Hem ObjectId hem string karşılaştırması için güvenli kontrol
    const isOwner =
      report.reporterId &&
      report.reporterId._id &&
      report.reporterId._id.toString() === userId.toString();
    if (role === "admin" || role === "moderator" || isOwner) {
      return res.status(200).json({ report });
    } else {
      return res
        .status(403)
        .json({ message: "Bu raporu görüntüleme yetkiniz yok." });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Rapor getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
};
// Cancel My Report
const cancelReport = async (req, res) => {
  try {
    const reporterId = req.user._id;
    const { reportId } = req.params;

    if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: "Geçersiz reportId." });
    }
    const report = await Report.findOne({ _id: reportId, reporterId });
    if (!report) {
      return res.status(404).json({ message: "Rapor bulunamadı." });
    }
    if (report.status.state !== "pending") {
      return res
        .status(400)
        .json({ message: "Sadece beklemede olan raporlar iptal edilebilir." });
    }
    report.status.state = "cancelled";
    await report.save();
    return res.status(200).json({ message: "Rapor iptal edildi.", report });
  } catch (error) {
    return res.status(500).json({
      message: "Rapor iptal edilirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Admin fonksiyonları

const getAllReports = async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== "admin") {
      return res
        .status(403)
        .json({ message: "Bu işlemi gerçekleştirme yetkiniz yok." });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    // Dinamik filtre oluştur
    const filter = {};

    // Rapor türüne göre filtre
    if (req.query.reportType) {
      filter.reportType = req.query.reportType;
    }

    // Durum filtresi (status.state)
    if (req.query.status) {
      filter["status.state"] = req.query.status;
    }

    // İşlem türüne göre filtre (status.actionTaken)
    if (req.query.actionTaken) {
      filter["status.actionTaken"] = req.query.actionTaken;
    }

    // Tarih aralığı filtresi
    const dateFilter = {};
    if (req.query.fromDate) {
      dateFilter.$gte = new Date(req.query.fromDate);
    }
    if (req.query.toDate) {
      dateFilter.$lte = new Date(req.query.toDate);
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.createdAt = dateFilter;
    }

    // Sıralama seçenekleri
    let sortOption = { createdAt: -1 };
    if (req.query.sortBy === "resolved") {
      sortOption = { "status.resolvedAt": -1 };
    } else if (req.query.sortBy === "oldest") {
      sortOption = { createdAt: 1 };
    }

    // Raporları getir
    const reports = await Report.find(filter)
      .populate("reporterId", "username email profile.name profile.surname")
      .populate("status.resolvedBy", "username email")
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    // İstatistikler
    const totalReports = await Report.countDocuments(filter);
    const pendingCount = await Report.countDocuments({
      "status.state": "pending",
    });
    const resolvedCount = await Report.countDocuments({
      "status.state": "resolved",
    });
    const rejectedCount = await Report.countDocuments({
      "status.state": "rejected",
    });
    const cancelledCount = await Report.countDocuments({
      "status.state": "cancelled",
    });

    return res.status(200).json({
      reports,
      pagination: {
        currentPage: page,
        limit,
        totalReports,
        totalPages: Math.ceil(totalReports / limit),
      },
      statistics: {
        pending: pendingCount,
        resolved: resolvedCount,
        rejected: rejectedCount,
        cancelled: cancelledCount,
        total: pendingCount + resolvedCount + rejectedCount + cancelledCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Raporlar getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
};

const resolveReport = async (req, res) => {
  const { reportId } = req.params;
  const { actionTaken, adminNote } = req.body;
  try {
    const role = req.user.role;
    if (role !== "admin") {
      return res
        .status(403)
        .json({ message: "Bu işlemi gerçekleştirme yetkiniz yok." });
    }
    if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: "Geçersiz reportId." });
    }
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Rapor bulunamadı." });
    }

    report.status.isResolved = true;
    report.status.state = "resolved";
    report.status.resolvedAt = new Date();
    report.status.resolvedBy = req.user._id;
    report.status.actionTaken = actionTaken || "none";
    report.status.adminNote = adminNote || "";
    await report.save();
    return res.status(200).json({ message: "Rapor çözüldü.", report });
  } catch (error) {
    return res.status(500).json({
      message: "Rapor çözülürken bir hata oluştu.",
      error: error.message,
    });
  }
};

module.exports = {
  createReport,
  getMyReports,
  getReportById,
  cancelReport,
  getAllReports,
  resolveReport,
};
