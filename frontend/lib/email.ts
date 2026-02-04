import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(to: string, code: string) {
  const info = await transporter.sendMail({
    from: `"AI Coach" <${process.env.SMTP_USER}>`, // sender address
    to, // list of receivers
    subject: "AI Coach 登录验证码", // Subject line
    text: `您的验证码是: ${code}。有效期 5 分钟。`, // plain text body
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #060E9F;">AI Coach 登录验证</h2>
        <p>您好，</p>
        <p>您正在登录 AI Coach 高管教练系统。</p>
        <p>您的验证码是：</p>
        <h1 style="color: #c1272d; letter-spacing: 5px;">${code}</h1>
        <p>验证码有效期为 5 分钟。如果不是您本人操作，请忽略此邮件。</p>
      </div>
    `, // html body
  });

  return info;
}
