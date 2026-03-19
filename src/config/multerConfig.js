const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Upload klasörlerini oluştur (yoksa)
const UPLOAD_ROOT = path.join(__dirname, "..", "..");
const uploadDirs = ["uploads/images", "uploads/files"];
uploadDirs.forEach((dir) => {
  fs.mkdirSync(path.join(UPLOAD_ROOT, dir), { recursive: true });
});

// Dosya türleri
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES];

// Dosya boyutu limitleri
const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const FILE_MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Multer depolama ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = file.mimetype.startsWith("image/")
      ? path.join(UPLOAD_ROOT, "uploads/images")
      : path.join(UPLOAD_ROOT, "uploads/files");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    //filename + date + ext şeklinde benzersiz bir isim oluştur
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Dosya Filtresi - İzin verilen türleri kontrol eder
const imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Sadece resim dosyalarına izin verilir!"), false);
  }
};

const fileFilter = (req, file, cb) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Sadece belirli dosya türlerine izin verilir!"), false);
  }
};

// Avatar yükleme 
const uploadAvatar = multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: IMAGE_MAX_SIZE },
  }).single("avatar");

  // Post görseli yükleme
  const uploadPostImage = multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: IMAGE_MAX_SIZE },
  }).array("images", 5);

  // Chat dosyası yükleme
    const uploadChatFile = multer({
        storage,
        fileFilter: fileFilter,
        limits: { fileSize: FILE_MAX_SIZE },
    }).single("file");


const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Dosya boyutu çok büyük." });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ message: "Çok fazla dosya yüklendi." });
    }
    return res.status(400).json({ message: `Yükleme hatası: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

module.exports = {
  uploadAvatar,
  uploadPostImage,
  uploadChatFile,
  handleMulterError,
};
