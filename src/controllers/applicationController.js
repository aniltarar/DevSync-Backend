const Application = require("@/models/application");
const Project = require("@/models/project");
const User = require("@/models/user");
const notificationService = require("@/services/notificationService");

// Projeye Başvuru Yap
const applyToProjectSlot = async (req, res) => {
  try {
    const { projectId, slotId, message } = req.body;
    const userId = req.user._id;

    // User, Project ve Slot doğrulaması
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "Kullanıcı bulunamadı.",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        message: "Proje bulunamadı.",
      });
    }

    const slot = project.slots.id(slotId);
    if (!slot) {
      return res.status(404).json({
        message: "Slot bulunamadı.",
      });
    }

    // Kota dolmuş mu kontrol et
    if (slot.filledBy.length >= slot.quota) {
      return res.status(400).json({
        message: "Bu pozisyon için kota dolmuştur, başvuru yapılamaz.",
      });
    }
    // Zaten başvuru yapmış mı kontrol et
    const existingApplication = await Application.findOne({
      projectId,
      slotId,
      userId,
    });
    if (existingApplication) {
      return res.status(400).json({
        message: "Bu slota zaten başvuru yaptınız.",
      });
    }
    // Yeni başvuru oluştur
    const application = new Application({
      projectId,
      slotId,
      userId,
      roleName: slot.roleName,
      message,
    });
    await application.save();

    // Proje sahibine yeni başvuru bildirimi gönder
    notificationService.createNotification({
      recipientId: project.ownerId,
      senderId: userId,
      type: "new_application",
      referenceId: application._id,
      referenceModel: "Application",
    }).catch(() => {});

    res.status(201).json({
      message: "Başvurunuz başarıyla gönderildi.",
      application,
    });
  } catch (error) {
    res.status(500).json({
      message: "Başvuru yapılırken hata oluştu.",
      error: error.message,
    });
  }
};

// Kullanıcı Başvurularını Görüntüle
const getMyApplications = async (req, res) => {
  try {
    const userId = req.user._id;
    const applications = await Application.find({ userId }).populate(
      "projectId",
      "title",
    );
    res.status(200).json({
      message: "Başvurularınız başarıyla getirildi.",
      applications,
    });
  } catch (error) {
    res.status(500).json({
      message: "Başvurularınız görüntülenirken hata oluştu.",
      error: error.message,
    });
  }
};

//Başvuruyu Geri Çek (İptal Et)
const cancelApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        message: "Başvuru bulunamadı.",
      });
    }

    if (application.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Bu işlemi yapmaya yetkiniz yok.",
      });
    }
    // Başvurunun mevcut durumunu kontrol et
    if (application.status === "accepted") {
      return res.status(400).json({
        message: "Bu başvuru onaylanmış, iptal edilemez.",
      });
    } else if (application.status === "rejected") {
      return res.status(400).json({
        message: "Bu başvuru reddedilmiş, iptal edilemez.",
      });
    } else if (application.status === "cancelled") {
      return res.status(400).json({
        message: "Bu başvuru zaten iptal edilmiş.",
      });
    }

    // Başvuruyu iptal et
    application.status = "cancelled";

    application.respondedAt = new Date();
    await application.save();

    res.status(200).json({
      message: "Başvurunuz başarıyla iptal edildi.",
      application,
    });
  } catch (error) {
    res.status(500).json({
      message: "Başvuru geri çekilirken (iptal) edilirken hata oluştu.",
      error: error.message,
    });
  }
};

// Proje Sahibi Controllerları
// Proje Sahibi Başvuruları Görüntüle
const viewApplicationsByPID = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;

    // Proje doğrulaması
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        message: "Proje bulunamadı.",
      });
    }

    if (project.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Bu işlemi yapmaya yetkiniz yok.",
      });
    }

    const applications = await Application.find({ projectId }).populate(
      "userId",
      "username profile titles skills socialLinks",
    );
    res.status(200).json({
      message: "Başvurular başarıyla getirildi.",
      applications,
    });
  } catch (error) {
    res.status(500).json({
      message: "Başvurular görüntülenirken hata oluştu.",
      error: error.message,
    });
  }
};

// Başvuruyu Onayla
const acceptApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        message: "Başvuru bulunamadı.",
      });
    }

    const project = await Project.findById(application.projectId);
    if (!project) {
      return res.status(404).json({
        message: "Proje bulunamadı.",
      });
    }

    if (project.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Bu işlemi yapmaya yetkiniz yok.",
      });
    }

    //Başvurunun mevcut durumunu kontrol et
    if (application.status === "accepted") {
      return res.status(400).json({
        message: "Bu başvuru zaten onaylanmış.",
      });
    } else if (application.status === "rejected") {
      return res.status(400).json({
        message: "Bu başvuru reddedilmiş, onaylanamaz.",
      });
    }

    // Slotu ve Quota kontrol et
    const slot = project.slots.id(application.slotId);
    if (!slot) {
      return res.status(404).json({
        message: "Slot bulunamadı.",
      });
    }

    if (slot.filledBy.length >= slot.quota) {
      return res.status(400).json({
        message: `Bu pozisyon için kota dolmuştur. (${slot.quota}/${slot.quota})`,
      });
    }

    // Aynı kullanıcı zaten bu slota kabul edilmiş mi?
    if (slot.filledBy.includes(application.userId.toString())) {
      return res.status(400).json({
        message: "Bu kullanıcı zaten bu pozisyona kabul edilmiş.",
      });
    }

    // Başvuruyu onayla
    application.status = "accepted";
    application.respondedAt = new Date();
    await application.save();

    // Kullanıcıyı slota ekle
    slot.filledBy.push(application.userId);

    // Kota doluysa slot statusunu güncelle ve diğer pending başvuruları otomatik reddet
    if (slot.filledBy.length >= slot.quota) {
      slot.status = "filled";

      // Bildirim için updateMany öncesinde etkilenen başvuruları al
      const pendingApps = await Application.find({
        projectId: project._id,
        slotId: slot._id,
        status: "pending",
      }).select("_id userId");

      await Application.updateMany(
        { projectId: project._id, slotId: slot._id, status: "pending" },
        { status: "rejected", respondedAt: new Date() },
      );

      // Otomatik reddedilen başvurucuları bilgilendir
      Promise.allSettled(
        pendingApps.map((app) =>
          notificationService.createNotification({
            recipientId: app.userId,
            senderId: userId,
            type: "application_update",
            referenceId: app._id,
            referenceModel: "Application",
          }),
        ),
      );
    }

    await project.save();

    // Başvuruyu kabul edilen kullanıcıya bildirim gönder
    notificationService.createNotification({
      recipientId: application.userId,
      senderId: userId,
      type: "application_update",
      referenceId: application._id,
      referenceModel: "Application",
    }).catch(() => {});

    res.status(200).json({
      message: "Başvuru başarıyla onaylandı.",
      application,
    });
  } catch (error) {
    res.status(500).json({
      message: "Başvuru onaylanırken hata oluştu.",
      error: error.message,
    });
  }
};

// Başvuruyu Reddet
const rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        message: "Başvuru bulunamadı.",
      });
    }

    const project = await Project.findById(application.projectId);
    if (!project) {
      return res.status(404).json({
        message: "Proje bulunamadı.",
      });
    }

    if (project.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Bu işlemi yapmaya yetkiniz yok.",
      });
    }

    // Başvurunun mevcut durumunu kontrol et
    if (application.status === "rejected") {
      return res.status(400).json({
        message: "Bu başvuru zaten reddedilmiş.",
      });
    } else if (application.status === "accepted") {
      return res.status(400).json({
        message: "Bu başvuru onaylanmış, reddedilemez.",
      });
    }

    // Başvuruyu reddet
    application.status = "rejected";
    application.respondedAt = new Date();
    await application.save();

    // Başvuruyu reddedilen kullanıcıya bildirim gönder
    notificationService.createNotification({
      recipientId: application.userId,
      senderId: userId,
      type: "application_update",
      referenceId: application._id,
      referenceModel: "Application",
    }).catch(() => {});

    res.status(200).json({
      message: "Başvuru başarıyla reddedildi.",
      application,
    });
  } catch (error) {
    res.status(500).json({
      message: "Başvuru reddedilirken hata oluştu.",
      error: error.message,
    });
  }
};

module.exports = {
  applyToProjectSlot,
  getMyApplications,
  cancelApplication,
  viewApplicationsByPID,
  acceptApplication,
  rejectApplication,
};
