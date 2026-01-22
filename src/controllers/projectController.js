const Project = require("@/models/project.js");

// Create Project
const createProject = async (req, res) => {
  try {
    const { title, description, category, projectType, slots } = req.body;

    // Gerekli alanları kontrol et
    if (!title || !category) {
      return res.status(400).json({
        message: "Başlık ve kategori zorunludur.",
      });
    }

    // Yeni proje oluştur
    const project = await Project.create({
      title,
      description,
      category,
      projectType: projectType || "personal",
      ownerId: req.user._id,
      slots: slots || [],
    });

    res.status(201).json({
      message: "Proje başarıyla oluşturuldu.",
      project,
    });
  } catch (error) {
    res.status(500).json({
      message: "Proje oluşturulurken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Get All Projects
const getAllProjects = async (req, res) => {
  try {
    const { status, category, projectType } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (projectType) filters.projectType = projectType;

    const projects = await Project.find(filters)
      .populate("ownerId", "username email profile")
      .sort({ createdAt: -1 });

    res.status(200).json({
      total: projects.length,
      data: projects,
    });
  } catch (error) {
    res.status(500).json({
      message: "Projeler getirilemedi.",
      error: error.message,
    });
  }
};

// Get Project By ID
const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId).populate(
      "ownerId",
      "username email profile",
    );

    if (!project) {
      return res.status(404).json({
        message: "Proje bulunamadı.",
      });
    }

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({
      message: "Proje getirilemedi.",
      error: error.message,
    });
  }
};

// Update Project
const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, category, projectType, status } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        message: "Proje bulunamadı.",
      });
    }

    // Proje sahibi mi kontrol et
    if (project.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Bu işlemi yapmaya yetkiniz yok.",
      });
    }

    // Güncelle
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        title: title || project.title,
        description: description || project.description,
        category: category || project.category,
        projectType: projectType || project.projectType,
        status: status || project.status,
      },
      { new: true },
    );

    res.status(200).json({
      message: "Proje başarıyla güncellendi.",
      project: updatedProject,
    });
  } catch (error) {
    res.status(500).json({
      message: "Proje güncellenemedi.",
      error: error.message,
    });
  }
};

// Delete Project
const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        message: "Proje bulunamadı.",
      });
    }

    // Proje sahibi mi kontrol et
    if (project.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Bu işlemi yapmaya yetkiniz yok.",
      });
    }

    await Project.findByIdAndDelete(projectId);

    res.status(200).json({
      message: "Proje başarıyla silindi.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Proje silinirken hata oluştu.",
      error: error.message,
    });
  }
};

// Get My Projects
const getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({ ownerId: req.user._id }).sort({
      createdAt: -1,
    });

    // Eğer proje yoksa boş dizi döndür ve mesaj ver.
    res.status(200).json({
      total: projects.length,
      data: projects,
      message: projects.length === 0 ? "Henüz projeniz yok." : "Projeler başarıyla getirildi."
      
    });
  } catch (error) {
    res.status(500).json({
      message: "Projeler getirilemedi.",
      error: error.message,
    });
  }
};

// Add Slot
const addSlot = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { roleName, requiredSkills, optionalSkills, quota } = req.body;

    if (!roleName || !requiredSkills || !quota) {
      return res.status(400).json({
        message: "Role adı, gerekli yetenekler ve kota zorunludur.",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        message: "Proje bulunamadı.",
      });
    }

    // Proje sahibi mi kontrol et
    if (project.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Bu işlemi yapmaya yetkiniz yok.",
      });
    }

    // Yeni slot ekle
    const newSlot = {
      roleName,
      requiredSkills,
      optionalSkills: optionalSkills || [],
      quota,
      status: "open",
      filledBy: [],
    };

    project.slots.push(newSlot);
    await project.save();

    res.status(201).json({
      message: "Slot başarıyla eklendi.",
      project,
    });
  } catch (error) {
    res.status(500).json({
      message: "Slot eklenirken hata oluştu.",
      error: error.message,
    });
  }
};

// Update Slot
const updateSlot = async (req, res) => {
  try {
    const { projectId, slotId } = req.params;
    const { roleName, requiredSkills, optionalSkills, quota, status } =
      req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        message: "Proje bulunamadı.",
      });
    }

    // Proje sahibi mi kontrol et
    if (project.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Bu işlemi yapmaya yetkiniz yok.",
      });
    }

    // Slot bul ve güncelle
    const slot = project.slots.id(slotId);
    if (!slot) {
      return res.status(404).json({
        message: "Slot bulunamadı.",
      });
    }

    if (roleName) slot.roleName = roleName;
    if (requiredSkills) slot.requiredSkills = requiredSkills;
    if (optionalSkills) slot.optionalSkills = optionalSkills;
    if (quota) slot.quota = quota;
    if (status) slot.status = status;

    await project.save();

    res.status(200).json({
      message: "Slot başarıyla güncellendi.",
      project,
    });
  } catch (error) {
    res.status(500).json({
      message: "Slot güncellenirken hata oluştu.",
      error: error.message,
    });
  }
};

// Delete Slot
const deleteSlot = async (req, res) => {
  try {
    const { projectId, slotId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        message: "Proje bulunamadı.",
      });
    }

    // Proje sahibi mi kontrol et
    if (project.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Bu işlemi yapmaya yetkiniz yok.",
      });
    }

    // Slot sil
    project.slots.pull({ _id: slotId });
    await project.save();

    res.status(200).json({
      message: "Slot başarıyla silindi.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Slot silinirken hata oluştu.",
      error: error.message,
    });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addSlot,
  updateSlot,
  deleteSlot,
  getMyProjects,
};
