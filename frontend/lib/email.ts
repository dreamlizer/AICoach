import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com", // Fallback to avoid crash on startup
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "user",
    pass: process.env.SMTP_PASS || "pass",
  },
});

export async function sendVerificationEmail(to: string, code: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP configuration missing");
    }
    console.warn("⚠️ SMTP configuration missing. Using MOCK mode.");
    console.log(`[MOCK EMAIL] To: ${to}`);
    console.log(`[MOCK EMAIL] Subject: EI CHINA 登录验证码`);
    console.log("[MOCK EMAIL] Code: <hidden>");
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      messageId: "mock-id-" + Date.now(),
      response: "250 OK: Mock email sent",
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"EI CHINA" <${process.env.SMTP_USER}>`,
      to,
      subject: "EI CHINA 登录验证码",
      text: `您的验证码是: ${code}。有效期 5 分钟。`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #060E9F;">EI CHINA 登录验证</h2>
          <p>您好，</p>
          <p>您正在登录 EI CHINA 高管教练系统。</p>
          <p>您的验证码是：</p>
          <h1 style="color: #c1272d; letter-spacing: 5px;">${code}</h1>
          <p>验证码有效期为 5 分钟。如果不是您本人操作，请忽略此邮件。</p>
        </div>
      `,
    });
    return info;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}
