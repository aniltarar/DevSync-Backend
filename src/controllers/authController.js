const User = require("@/models/user");
const Token = require("@/models/token");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Token Oluşturma Fonksiyonu || Token Generation Function

const generateTokens = async (user) => {
  // Kısa süreli erişim token'ı || Short-lived access token
  const accessToken = jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  // Uzun süreli refresh token'ı || Long-lived refresh token
  const refreshToken = jwt.sign(
    {
      _id: user._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  //   DB'de kayıtlı olan token'ı sil. || Delete existing token in DB.
  await Token.deleteMany({ userId: user._id });

  // Yeni token'ı oluştur ve kaydet. || Create and save new token.
  const newRefreshToken = await Token.create({
    userId: user._id,
    refreshToken: refreshToken,
    date: new Date(),
  });

  return { accessToken, refreshToken };
};

// Kullanıcı Kayıt Fonksiyonu || User Registration Function

const register = async (req, res) => {
  try {
    const { username, name, surname, email, password } = req.body;
    if (!username || !name || !surname || !email || !password) {
      return res.status(400).json({
        message:
          "Kullanıcı adı, isim, soyisim, email ve parola alanları zorunludur.",
      });
    }
    // Kullanıcı adı veya email zaten kayıtlı mı? || Is username or email already registered?
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Kullanıcı adı veya email zaten kayıtlı." });
    }
    // Parolayı hash'le || Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Yeni kullanıcı oluştur || Create new user
    const user = await User.create({
      username,
      profile: {
        name,
        surname,
      },
      email,
      password: hashedPassword,
    });

    // Token'ları oluştur || Generate tokens
    const tokens = await generateTokens(user);

    const userWithoutPassword = {
      _id: user._id,
      username: user.username,
      profile: user.profile,
      email: user.email,
      role: user.role,
      socialLinks: user.socialLinks,
    };

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: "Kayıt işlemi başarısız.", error });
  }
};



// Tokenleri yenilemek için fonksiyon || Function to refresh tokens

const tokenRefresh = async (req, res) => {
  try {
    // refreshToken'in eski halini al || Get the old refreshToken
    const oldRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({
        message: "Refresh token bulunamadı. Lütfen tekrar giriş yapın.",
      });
    }
    // DB'de tokeni bul || Find the token in DB

    const storedToken = await Token.findOne({ refreshToken: oldRefreshToken });
    if (!storedToken) {
      return res.status(403).json({
        message: "Geçersiz refresh token. Lütfen tekrar giriş yapın.",
      });
    }
    // Kullanıcıyı bul || Find the user
    const user = await User.findById(storedToken.userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }
    // Yeni tokenleri oluştur || Generate new tokens
    const tokens = await generateTokens(user);

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    return res.status(200).json(tokens);
  } catch (error) {
    res.status(500).json({
      message: "Token yenileme sırasında bir hata oluştu.",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email ve parola alanları zorunludur." });
    }
    // Kullanıcıyı email ile bul || Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Bu email ile kayıtlı kullanıcı bulunamadı." });
    }
    // Parolayı doğrula || Verify password

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ message: "Parola yanlış. Tekrar deneyiniz." });
    }

    // Token'ları oluştur || Generate tokens
    const tokens = await generateTokens(user);

    const userWithoutPassword = {
      _id: user._id,
      username: user.username,
      profile: user.profile,
      email: user.email,
      role: user.role,
      socialLinks: user.socialLinks,
      skills: user.skills,
      titles: user.titles,
    };
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });
    res.status(200).json({
      message: "Başarıyla giriş yapıldı.",
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Giriş işlemi başarısız.", error });
  }
};

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({
        message: "Çıkış yapmak için refresh token gereklidir.",
      });
    }
    const deletedToken = await Token.deleteOne({ refreshToken });
    if (deletedToken.deletedCount === 0) {
      return res.status(403).json({
        message: "Geçersiz refresh token. Çıkış yaparken bir sorun oluştu.",
      });
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.status(200).json({
      message: "Başarıyla çıkış yapıldı.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Çıkış sırasında bir hata oluştu.",
      error: error.message,
    });
  }
};

// Avatar Yükleme Fonksiyonu || Upload Avatar Function
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Dosya yüklenmedi." });
    }

    const avatarUrl = `/uploads/images/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { "profile.avatarUrl": avatarUrl },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    res.status(200).json({
      message: "Profil fotoğrafı başarıyla yüklendi.",
      avatarUrl,
      profile: user.profile,
    });
  } catch (error) {
    res.status(500).json({
      message: "Profil fotoğrafı yüklenirken hata oluştu.",
      error: error.message,
    });
  }
};

// Profil Güncelleme Fonksiyonu || Update Profile Function
const PROFILE_FIELD_MAP = {
  username: "username",
  name: "profile.name",
  surname: "profile.surname",
  bio: "profile.bio",
  location: "profile.location",
  titles: "titles",
  skills: "skills",
};

const SOCIAL_LINK_KEYS = ["github", "linkedin", "portfolio"];

const updateProfile = async (req, res) => {
  try {
    const { socialLinks, ...rest } = req.body;

    const updates = Object.entries(PROFILE_FIELD_MAP).reduce((acc, [bodyKey, dbKey]) => {
      if (rest[bodyKey] !== undefined) acc[dbKey] = rest[bodyKey];
      return acc;
    }, {});

    if (socialLinks) {
      SOCIAL_LINK_KEYS.filter((key) => socialLinks[key] !== undefined).forEach((key) => {
        updates[`socialLinks.${key}`] = socialLinks[key];
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Güncellenecek alan bulunamadı." });
    }

    if (updates.titles !== undefined && updates.titles.length > 10) {
      return res.status(400).json({ message: "En fazla 10 unvan eklenebilir." });
    }

    if (updates.skills !== undefined && updates.skills.length > 20) {
      return res.status(400).json({ message: "En fazla 20 yetenek eklenebilir." });
    }

    // Username benzersizlik kontrolü || Username uniqueness check
    if (updates.username) {
      const existingUser = await User.findOne({ username: updates.username, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(409).json({ message: "Bu kullanıcı adı zaten kullanılıyor." });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    res.status(200).json({ message: "Profil başarıyla güncellendi.", user });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Geçersiz veri.", error: error.message });
    }
    res.status(500).json({ message: "Profil güncellenirken hata oluştu.", error: error.message });
  }
};

module.exports = {
  register,
  login,
  tokenRefresh,
  logout,
  uploadAvatar,
  updateProfile,
};
