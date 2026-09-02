import { sendRecoveryEmail } from "./src/mailer.js";
import dotenv from "dotenv";

dotenv.config();

async function runEmailTest() {
    console.log("🚀 Testing Nodemailer Configuration...\n");

    // Replace with your real email address to verify receipt
    const recipientEmail = process.env.SMTP_USER || "test@example.com";

    const result = await sendRecoveryEmail({
        toEmail: recipientEmail,
        amountInr: 1499,
        recoveryLink: "https://rzp.io/rzp/jtO9rEIx",
    });

    if (result.success) {
        console.log("\n✅ SUCCESS! Check your inbox at:", recipientEmail);
        console.log("Message ID:", result.messageId);
    } else {
        console.log("\n❌ FAILED to send email.");
        console.log("Error details:", result.error);
    }
}

runEmailTest();