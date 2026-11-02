const nodemailer = require("nodemailer");

function isPasswordResetEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    (process.env.SMTP_FROM || process.env.SMTP_USER)
  );
}

async function sendPasswordResetCode(email, code) {
  if (!isPasswordResetEmailConfigured()) {
    const error = new Error("PASSWORD_RESET_EMAIL_NOT_CONFIGURED");
    error.code = "PASSWORD_RESET_EMAIL_NOT_CONFIGURED";
    throw error;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Your DoveX password reset code",
    text: "Your DoveX password reset code is " + code + ". It expires in 10 minutes. If you did not request this, you can ignore this email.",
    html: '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:28px;color:#171717"><h1 style="font-size:22px">Reset your DoveX password</h1><p>Use this code to choose a new password:</p><div style="display:inline-block;background:#f2f2f2;border-radius:12px;padding:14px 22px;font-size:30px;font-weight:700;letter-spacing:8px">' + code + '</div><p style="color:#666">This code expires in 10 minutes. If you did not request this, ignore this email.</p></div>'
  });
}

module.exports = { isPasswordResetEmailConfigured, sendPasswordResetCode };