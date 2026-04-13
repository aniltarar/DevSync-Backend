const User = require("@/models/user");
const Token = require("@/models/token");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createNotification } = require("@/services/notificationService");
const logger = require("@/config/loggerConfig");

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
    { expiresIn: "15m" },
  );

  // Uzun süreli refresh token'ı || Long-lived refresh token
  const refreshToken = jwt.sign(
    {
      _id: user._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" },
  );

  //   DB'de kayıtlı olan token'ı sil. || Delete existing token in DB.
  await Token.deleteMany({ userId: user._id });

  // Yeni token'ı oluştur ve kaydet. || Create and save new token.
  await Token.create({
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

    // Kullanıcı banlanmış mı kontrol et || Check if user is banned
    if (!user.status) {
      return res
        .status(403)
        .json({ message: "Hesabınız banlanmıştır. Giriş yapamazsınız." });
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
    if (refreshToken) {
      await Token.deleteOne({ refreshToken });
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
      { new: true },
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

const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { "profile.avatarUrl": "" } },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    res.status(200).json({
      message: "Profil fotoğrafı başarıyla silindi.",
      profile: user.profile,
    });
  } catch (error) {
    res.status(500).json({
      message: "Profil fotoğrafı silinirken hata oluştu.",
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

    const updates = Object.entries(PROFILE_FIELD_MAP).reduce(
      (acc, [bodyKey, dbKey]) => {
        if (rest[bodyKey] !== undefined) acc[dbKey] = rest[bodyKey];
        return acc;
      },
      {},
    );

    if (socialLinks) {
      SOCIAL_LINK_KEYS.filter((key) => socialLinks[key] !== undefined).forEach(
        (key) => {
          updates[`socialLinks.${key}`] = socialLinks[key];
        },
      );
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "Güncellenecek alan bulunamadı." });
    }

    if (updates.titles !== undefined && updates.titles.length > 10) {
      return res
        .status(400)
        .json({ message: "En fazla 10 unvan eklenebilir." });
    }

    if (updates.skills !== undefined && updates.skills.length > 20) {
      return res
        .status(400)
        .json({ message: "En fazla 20 yetenek eklenebilir." });
    }

    // Username benzersizlik kontrolü || Username uniqueness check
    if (updates.username) {
      const existingUser = await User.findOne({
        username: updates.username,
        _id: { $ne: req.user._id },
      });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Bu kullanıcı adı zaten kullanılıyor." });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    res.status(200).json({ message: "Profil başarıyla güncellendi.", user });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Geçersiz veri.", error: error.message });
    }
    res.status(500).json({
      message: "Profil güncellenirken hata oluştu.",
      error: error.message,
    });
  }
};

// Profil Görüntüleme Fonksiyonu || Get Profile Function
const getProfile = async (req, res) => {
  try {
    const targetId = req.params.id;

    const [currentUser, targetUser] = await Promise.all([
      User.findById(req.user._id).select("blockedUsers following"),
      User.findById(targetId).select(
        "_id username profile email role socialLinks skills titles blockedUsers followers following",
      ),
    ]);

    if (!targetUser) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const isBlocked = currentUser.blockedUsers.some(
      (id) => id.toString() === targetId,
    );
    const isBlockedBy = targetUser.blockedUsers.some(
      (id) => id.toString() === req.user._id.toString(),
    );
    const isFollowing = currentUser.following.some(
      (id) => id.toString() === targetId,
    );
    const isFollowedBy = targetUser.following.some(
      (id) => id.toString() === req.user._id.toString(),
    );

    const { blockedUsers: _, followers: __, following: ___, ...user } = targetUser.toObject();
    res.status(200).json({
      user,
      isBlocked,
      isBlockedBy,
      isFollowing,
      isFollowedBy,
      followersCount: targetUser.followers.length,
      followingCount: targetUser.following?.length ?? 0,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Profil getirilirken hata oluştu.",
        error: error.message,
      });
  }
};

// Kullanıcı Engelleme / Engel Kaldırma Fonksiyonu || Block / Unblock User Function
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Kendinizi engelleyemezsiniz." });
    }

    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const currentUser = await User.findById(req.user._id);
    const isBlocked = currentUser.blockedUsers.includes(userId);

    if (isBlocked) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { blockedUsers: userId },
      });
      return res.status(200).json({ message: "Kullanıcı engeli kaldırıldı." });
    } else {
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { blockedUsers: userId },
      });
      return res.status(200).json({ message: "Kullanıcı engellendi." });
    }
  } catch (error) {
    res.status(500).json({
      message: "Kullanıcı engellenirken hata oluştu.",
      error: error.message,
    });
  }
};

// Kullanıcı Takip Et / Takibi Bırak || Follow / Unfollow User
const followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({ message: "Kendinizi takip edemezsiniz." });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const currentUser = await User.findById(currentUserId);
    const isFollowing = currentUser.following.some(
      (id) => id.toString() === userId,
    );

    if (isFollowing) {
      await Promise.all([
        User.findByIdAndUpdate(currentUserId, { $pull: { following: userId } }),
        User.findByIdAndUpdate(userId, { $pull: { followers: currentUserId } }),
      ]);
      return res
        .status(200)
        .json({ message: "Takipten çıkıldı.", isFollowing: false });
    } else {
      await Promise.all([
        User.findByIdAndUpdate(currentUserId, {
          $addToSet: { following: userId },
        }),
        User.findByIdAndUpdate(userId, {
          $addToSet: { followers: currentUserId },
        }),
      ]);
      createNotification({
        recipientId: userId,
        senderId: currentUserId,
        type: "follow",
        referenceId: currentUserId,
        referenceModel: "User",
      }).catch((err) => logger.warn("follow bildirimi gönderilemedi.", { error: err.message }));
      return res
        .status(200)
        .json({ message: "Takip edildi.", isFollowing: true });
    }
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Takip işlemi sırasında hata oluştu.",
        error: error.message,
      });
  }
};

// Takip Ettiklerimi Getir || Get Following List
const getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("following")
      .populate(
        "following",
        "username profile.name profile.surname profile.avatarUrl onlineStatus",
      );

    res.status(200).json({ following: user.following });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Takip listesi getirilirken hata oluştu.",
        error: error.message,
      });
  }
};

// Takipçilerimi Getir || Get Followers List
const getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("followers")
      .populate(
        "followers",
        "username profile.name profile.surname profile.avatarUrl onlineStatus",
      );

    res.status(200).json({ followers: user.followers });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Takipçi listesi getirilirken hata oluştu.",
        error: error.message,
      });
  }
};

// Kullanıcı Arama || Search Users
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Arama terimi en az 2 karakter olmalıdır." });
    }

    const regex = new RegExp(q.trim(), "i");

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: regex },
        { "profile.name": regex },
        { "profile.surname": regex },
      ],
    })
      .select(
        "username profile.name profile.surname profile.avatarUrl onlineStatus",
      )
      .limit(20);

    // Her kullanıcı için isFollowing bilgisi ekle
    const currentUser = await User.findById(req.user._id).select(
      "following blockedUsers",
    );
    const result = users.map((u) => ({
      ...u.toObject(),
      isFollowing: currentUser.following.some(
        (id) => id.toString() === u._id.toString(),
      ),
      isBlocked: currentUser.blockedUsers.some(
        (id) => id.toString() === u._id.toString(),
      ),
    }));

    res.status(200).json({ users: result });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Kullanıcı aranırken hata oluştu.",
        error: error.message,
      });
  }
};

module.exports = {
  register,
  login,
  tokenRefresh,
  logout,
  uploadAvatar,
  deleteAvatar,
  updateProfile,
  getProfile,
  blockUser,
  followUser,
  getFollowing,
  getFollowers,
  searchUsers,
};
