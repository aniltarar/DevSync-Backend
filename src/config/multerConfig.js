const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const PROVIDER = process.env.STORAGE_PROVIDER || "local";

// ─── Cloudinary config ────────────────────────────────────────
if (PROVIDER === "cloudinary") {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ─── Local storage ────────────────────────────────────────────
const UPLOAD_ROOT = path.join(__dirname, "..", "..");

if (PROVIDER === "local") {
  ["uploads/images", "uploads/files"].forEach((dir) =>
    fs.mkdirSync(path.join(UPLOAD_ROOT, dir), { recursive: true })
  );
}

const localDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.mimetype.startsWith("image/") ? "uploads/images" : "uploads/files";
    cb(null, path.join(UPLOAD_ROOT, folder));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + unique + path.extname(file.originalname));
  },
});

// ─── Cloudinary storages ──────────────────────────────────────
const avatarCloudStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "devsync/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  },
});

const postCloudStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "devsync/posts",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
  },
});

const chatCloudStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "devsync/chat",
    resource_type: "auto",
  },
});

// ─── File filters ─────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const imageFilter = (req, file, cb) =>
  ALLOWED_IMAGE_TYPES.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Sadece resim dosyalarına izin verilir!"), false);

const fileFilter = (req, file, cb) =>
  ALLOWED_IMAGE_TYPES.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Sadece belirli dosya türlerine izin verilir!"), false);

// ─── Limits ───────────────────────────────────────────────────
const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const FILE_MAX_SIZE = 10 * 1024 * 1024;

// ─── Upload middlewares ───────────────────────────────────────
const uploadAvatar = multer({
  storage: PROVIDER === "cloudinary" ? avatarCloudStorage : localDiskStorage,
  fileFilter: imageFilter,
  limits: { fileSize: IMAGE_MAX_SIZE },
}).single("avatar");

const uploadPostImage = multer({
  storage: PROVIDER === "cloudinary" ? postCloudStorage : localDiskStorage,
  fileFilter: imageFilter,
  limits: { fileSize: IMAGE_MAX_SIZE },
}).array("images", 5);

const uploadChatFile = multer({
  storage: PROVIDER === "cloudinary" ? chatCloudStorage : localDiskStorage,
  fileFilter: fileFilter,
  limits: { fileSize: FILE_MAX_SIZE },
}).single("file");

// ─── URL normalizer ───────────────────────────────────────────
// Controller'larda req.file.url kullanılır — provider farkı burada soyutlanır
const normalizeFileUrl = (req, res, next) => {
  const toUrl = (file) => {
    if (PROVIDER === "cloudinary") return file.path;
    const folder = file.mimetype.startsWith("image/") ? "images" : "files";
    return `/uploads/${folder}/${file.filename}`;
  };

  if (req.file) req.file.url = toUrl(req.file);
  if (req.files?.length) req.files.forEach((f) => { f.url = toUrl(f); });
  next();
};

// ─── Error handler ────────────────────────────────────────────
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ message: "Dosya boyutu çok büyük." });
    if (err.code === "LIMIT_FILE_COUNT") return res.status(400).json({ message: "Çok fazla dosya yüklendi." });
    return res.status(400).json({ message: `Yükleme hatası: ${err.message}` });
  }
  if (err) return res.status(400).json({ message: err.message });
  next();
};

module.exports = {
  uploadAvatar,
  uploadPostImage,
  uploadChatFile,
  normalizeFileUrl,
  handleMulterError,
};
