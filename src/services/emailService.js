const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const buildEmailLayout = (content) => `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background:#F8FAFC; font-family:'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4F46E5 0%,#0EA5E9 100%); border-radius:12px 12px 0 0; padding:36px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:26px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">Dev</span><span style="font-size:26px; font-weight:800; color:#e0e7ff; letter-spacing:-0.5px;">Sync</span>
                    <span style="display:inline-block; margin-left:10px; background:rgba(255,255,255,0.18); color:#ffffff; font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; letter-spacing:0.5px; vertical-align:middle;">Geliştirici Topluluğu</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff; padding:40px; border-left:1px solid #E2E8F0; border-right:1px solid #E2E8F0;">
              ${content}
            </td>
          </tr>

          <!-- Demo Notice -->
          <tr>
            <td style="background:#F1F5F9; border:1px solid #E2E8F0; border-top:none; padding:20px 40px; border-radius:0 0 12px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-left:3px solid #4F46E5; padding-left:14px;">
                    <p style="margin:0 0 4px 0; font-size:12px; font-weight:700; color:#4F46E5; text-transform:uppercase; letter-spacing:0.5px;">Demo Projesi</p>
                    <p style="margin:0 0 6px 0; font-size:12px; color:#64748B; line-height:1.6;">
                      Bu e-posta <strong>DevSync</strong> demo uygulaması kapsamında gönderilmiştir. DevSync; geliştiricilerin proje bulabileceği, işbirliği yapabileceği ve birbirini takip edebileceği modern bir platform konseptidir.
                    </p>
                    <p style="margin:0; font-size:12px; color:#64748B; line-height:1.6;">
                      Projeyi geliştiren: <strong style="color:#4F46E5;">Anıl Tarar</strong> &mdash; Full-Stack Developer<br/>
                      İşbirliği &amp; iletişim için:
                      <a href="mailto:aniltararr@gmail.com" style="color:#0EA5E9; text-decoration:none; font-weight:600;">aniltararr@gmail.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify-email/${token}`;

  const content = `
    <h2 style="margin:0 0 8px 0; font-size:22px; font-weight:700; color:#1E293B;">E-posta Adresinizi Doğrulayın</h2>
    <p style="margin:0 0 24px 0; font-size:15px; color:#64748B; line-height:1.7;">
      DevSync'e hoş geldiniz! 🎉<br/>
      Hesabınız başarıyla oluşturuldu. Platformu kullanmaya başlamak için e-posta adresinizi doğrulamanız yeterli.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
      <tr>
        <td style="background:linear-gradient(135deg,#4F46E5 0%,#0EA5E9 100%); border-radius:8px;">
          <a href="${verifyUrl}"
            style="display:inline-block; padding:14px 32px; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700; letter-spacing:0.3px;">
            ✉&nbsp; E-postamı Doğrula
          </a>
        </td>
      </tr>
    </table>

    <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:16px 20px; margin-bottom:24px;">
      <p style="margin:0; font-size:13px; color:#64748B; line-height:1.6;">
        Butona tıklayamıyorsanız aşağıdaki linki tarayıcınıza kopyalayın:<br/>
        <a href="${verifyUrl}" style="color:#4F46E5; word-break:break-all; font-size:12px;">${verifyUrl}</a>
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#FFF7ED; border-left:3px solid #F59E0B; border-radius:0 6px 6px 0; padding:12px 16px;">
          <p style="margin:0; font-size:13px; color:#92400E;">
            ⏰ Bu doğrulama linki <strong>24 saat</strong> geçerlidir.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0 0; font-size:13px; color:#94A3B8;">
      Bu hesabı siz oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz.
    </p>
  `;

  await transporter.sendMail({
    from: `"DevSync" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "DevSync — E-posta Adresinizi Doğrulayın",
    html: buildEmailLayout(content),
  });
};

module.exports = { sendVerificationEmail };
