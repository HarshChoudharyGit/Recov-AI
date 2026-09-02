import dotenv from "dotenv";

dotenv.config();

/**
 * Centralized configuration module.
 * Validates required environment variables on startup and exports
 * a frozen config object used by all modules.
 */

const required = ["GROQ_API_KEY"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
    console.error(`\n❌ [CONFIG] Missing required environment variables:\n   ${missing.join(", ")}`);
    console.error(`   Please add them to your .env file.\n`);
    process.exit(1);
}

const config = Object.freeze({
    port: parseInt(process.env.PORT, 10) || 3000,

    // Razorpay
    razorpay: Object.freeze({
        keyId: process.env.RZP_TEST_KEY_ID || "",
        keySecret: process.env.RZP_TEST_KEY_SECRET || "",
        get isConfigured() {
            return Boolean(this.keyId && this.keySecret);
        },
    }),

    // Groq / LLM
    groq: Object.freeze({
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    }),

    // SMTP / Mailer
    smtp: Object.freeze({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
        get isConfigured() {
            return Boolean(this.user && this.pass);
        },
    }),
});

export default config;
