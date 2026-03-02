const Notification = require("@/models/notification");
const { getIO } = require("@/socket/socketServer");

// ========================
// BİLDİRİM OLUŞTUR ve EMIT ET
// ========================
const createNotification = async ({ recipientId, senderId, type, referenceId, referenceModel }) => {
  // Kendine bildirim gönderme
  if (recipientId.toString() === senderId?.toString()) return null;

  const notification = await Notification.create({
    recipientId,
    senderId,
    type,
    referenceId,
    referenceModel,
  });

  const populated = await notification.populate("senderId", "username profile.avatarUrl");

  // Kullanıcının kişisel odasına gerçek zamanlı bildirim gönder
  try {
    getIO().to(`user:${recipientId}`).emit("newNotification", populated);
  } catch (_) {
    // Socket henüz başlatılmadıysa sessizce geç
  }

  return populated;
};

// ========================
// BİLDİRİMLERİ GETİR (sayfalama)
// ========================
const getNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const filter = { recipientId: userId };
  if (unreadOnly) filter.isRead = false;

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .populate("senderId", "username profile.avatarUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ========================
// OKUNMAMIŞ SAYISI
// ========================
const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ recipientId: userId, isRead: false });
};

// ========================
// TEK BİLDİRİM OKUNDU
// ========================
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: userId, isRead: false },
    { isRead: true, readAt: new Date() },
    { new: true },
  );

  return notification;
};

// ========================
// TÜMÜNÜ OKUNDU İŞARETLE
// ========================
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { isRead: true, readAt: new Date() },
  );

  return result.modifiedCount;
};

module.exports = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
