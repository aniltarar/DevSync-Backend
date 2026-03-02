const notificationService = require("@/services/notificationService");

// ========================
// BİLDİRİMLERİ GETİR
// ========================
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unreadOnly === "true";

    const result = await notificationService.getNotifications(userId, { page, limit, unreadOnly });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Bildirimler alınırken hata oluştu.", error: error.message });
  }
};

// ========================
// OKUNMAMIŞ SAYISI
// ========================
const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: "Okunmamış sayısı alınırken hata oluştu.", error: error.message });
  }
};

// ========================
// TEK BİLDİRİM OKUNDU
// ========================
const markAsRead = async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);

    if (!notification) {
      return res.status(404).json({ message: "Bildirim bulunamadı." });
    }

    res.status(200).json({ message: "Bildirim okundu olarak işaretlendi.", notification });
  } catch (error) {
    res.status(500).json({ message: "Bildirim güncellenirken hata oluştu.", error: error.message });
  }
};

// ========================
// TÜMÜNÜ OKUNDU İŞARETLE
// ========================
const markAllAsRead = async (req, res) => {
  try {
    const count = await notificationService.markAllAsRead(req.user.id);
    res.status(200).json({ message: "Tüm bildirimler okundu olarak işaretlendi.", updatedCount: count });
  } catch (error) {
    res.status(500).json({ message: "Bildirimler güncellenirken hata oluştu.", error: error.message });
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
