import nodemailer from "nodemailer";
import config from "./config/env.js";

const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: false,
    auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
    },
});

/**
 * Send a recovery email using AI-generated or fallback content.
 *
 * @param {Object} opts
 * @param {string} opts.toEmail        – Recipient email address
 * @param {string} opts.customerName   – Customer display name
 * @param {number} opts.amountInr      – Transaction amount in INR
 * @param {string} opts.recoveryLink   – Razorpay short payment link
 * @param {string} [opts.subject]      – AI-generated email subject (optional)
 * @param {string} [opts.body]         – AI-generated email body text (optional)
 * @returns {{ success: boolean, messageId?: string, error?: string }}
 */
export async function sendRecoveryEmail({
    toEmail,
    customerName,
    amountInr,
    recoveryLink,
    subject,
    body,
}) {
    // Skip if SMTP is not configured
    if (!config.smtp.isConfigured) {
        console.warn("⚠️  SMTP credentials not configured – skipping email dispatch.");
        return { success: false, error: "SMTP not configured" };
    }

    const emailSubject = subject || `Action Required: Complete your ₹${amountInr} payment`;
    const emailBody = body || `We noticed your recent payment of ₹${amountInr} was not completed. Please use the secure link below to finish your transaction.`;

    try {
        const mailOptions = {
            from: `"RecovAI Recovery" <${config.smtp.user}>`,
            to: toEmail,
            subject: emailSubject,
            html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#f0f4f8; font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8; padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:32px 40px;">
            <h1 style="margin:0; color:#fff; font-size:24px; font-weight:700;">⚡ RecovAI</h1>
            <p style="margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:14px;">Autonomous Revenue Recovery Pipeline</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="margin:0 0 16px; color:#1e293b; font-size:20px;">Hi ${customerName || "there"},</h2>
            <p style="color:#475569; font-size:15px; line-height:1.7; margin:0 0 20px;">
              ${emailBody}
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td style="background:#10b981; border-radius:8px; padding:14px 32px;">
                  <a href="${recoveryLink}" style="color:#fff; text-decoration:none; font-size:16px; font-weight:600; display:inline-block;">
                    ✅ Complete Payment – ₹${amountInr}
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0; font-size:13px; color:#94a3b8;">
              Or copy this link: <a href="${recoveryLink}" style="color:#6366f1; word-break:break-all;">${recoveryLink}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc; padding:20px 40px; border-top:1px solid #e2e8f0;">
            <p style="margin:0; font-size:11px; color:#94a3b8; text-align:center;">
              Powered by RecovAI • Razorpay Secured • This link expires in 24 hours
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Recovery email sent to ${toEmail} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Email dispatch failed for ${toEmail}:`, error.message);
        return { success: false, error: error.message };
    }
}