import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const appName = "Job Tracker";

  await transporter.sendMail({
    from: `"${appName}" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset your password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Reset your password</h2>
        <p>You requested a password reset for your ${appName} account.</p>
        <p>Click the button below to set a new password:</p>
        <p>
          <a href="${resetLink}" style="
            display:inline-block;
            padding:12px 18px;
            background:#2563eb;
            color:#fff;
            text-decoration:none;
            border-radius:8px;
            font-weight:600;
          ">
            Reset Password
          </a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      </div>
    `,
  });
}