import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "..", "..", "recovai.db");

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    transaction_id TEXT UNIQUE,
    payment_link_id TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    amount_inr REAL,
    failure_code TEXT,
    status TEXT,
    recovery_link TEXT,
    retry_count INTEGER DEFAULT 0,
    channel_messages TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovered_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT,
    node_name TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS guardrail_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migration for existing tables: ensure payment_link_id column exists
try {
    db.exec(`ALTER TABLE transactions ADD COLUMN payment_link_id TEXT;`);
} catch (e) {
    // Column already exists
}

// Initialize default guardrails if not present
const initGuardrails = () => {
    const defaultSettings = [
        { key: "max_retry_count", value: "3" },
        { key: "high_value_threshold", value: "25000" },
        {
            key: "soft_decline_codes",
            value: JSON.stringify(["BAD_REQUEST_PAYMENT_TIMED_OUT", "GATEWAY_ERROR", "INSUFFICIENT_FUNDS", "NETWORK_ERROR", "ISSUER_DOWN"]),
        },
        {
            key: "hard_decline_codes",
            value: JSON.stringify(["CARD_STOLEN_OR_FRAUD", "INVALID_ACCOUNT_DETAILS", "CARD_EXPIRED", "SUSPECTED_FRAUD", "RESTRICTED_CARD"]),
        },
        { key: "default_channel", value: "whatsapp" },
    ];

    const insert = db.prepare("INSERT OR IGNORE INTO guardrail_settings (key, value) VALUES (?, ?)");
    for (const setting of defaultSettings) {
        insert.run(setting.key, setting.value);
    }
};

initGuardrails();

// Seed initial historical transactions if table is empty
const seedDataIfEmpty = () => {
    const count = db.prepare("SELECT COUNT(*) as count FROM transactions").get().count;
    if (count > 0) return;

    const seedTransactions = [
        {
            id: "tx_seed_1",
            transaction_id: "pay_Nzk1001",
            payment_link_id: "plink_seed01",
            customer_name: "Aarav Sharma",
            customer_email: "aarav.sharma@example.com",
            customer_phone: "+919876500001",
            amount_inr: 2499,
            failure_code: "BAD_REQUEST_PAYMENT_TIMED_OUT",
            status: "RECOVERED",
            recovery_link: "https://rzp.io/rzp/seed01",
            retry_count: 1,
            channel_messages: JSON.stringify({
                whatsapp: "Hi Aarav, your payment of ₹2,499 timed out. Please complete it here: https://rzp.io/rzp/seed01",
                sms: "Payment for ₹2499 failed due to timeout. Complete now: https://rzp.io/rzp/seed01",
                email_subject: "Action Required: Complete your order with RecovAI",
                email_body: "Hi Aarav, your payment timed out. Use this secure link to finalize your order: https://rzp.io/rzp/seed01",
            }),
            created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
            recovered_at: new Date(Date.now() - 3600000 * 6).toISOString(),
        },
        {
            id: "tx_seed_2",
            transaction_id: "pay_Nzk1002",
            payment_link_id: "plink_seed02",
            customer_name: "Sneha Reddy",
            customer_email: "sneha.reddy@example.com",
            customer_phone: "+919876500002",
            amount_inr: 8900,
            failure_code: "INSUFFICIENT_FUNDS",
            status: "RECOVERY_SENT",
            recovery_link: "https://rzp.io/rzp/seed02",
            retry_count: 1,
            channel_messages: JSON.stringify({
                whatsapp: "Hi Sneha, your payment of ₹8,900 couldn't be processed due to insufficient funds. Retry using: https://rzp.io/rzp/seed02",
                sms: "RecovAI: Payment of ₹8900 failed (insufficient balance). Secure link: https://rzp.io/rzp/seed02",
                email_subject: "Update your payment details to complete checkout",
                email_body: "Hi Sneha, we noticed an issue processing ₹8,900. You can retry with another payment method here: https://rzp.io/rzp/seed02",
            }),
            created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
            recovered_at: null,
        },
        {
            id: "tx_seed_3",
            transaction_id: "pay_Nzk1003",
            payment_link_id: null,
            customer_name: "Rohan Verma",
            customer_email: "rohan.v@example.com",
            customer_phone: "+919876500003",
            amount_inr: 14500,
            failure_code: "CARD_STOLEN_OR_FRAUD",
            status: "ESCALATED_HARD_DECLINE",
            recovery_link: null,
            retry_count: 0,
            channel_messages: null,
            created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
            recovered_at: null,
        },
        {
            id: "tx_seed_4",
            transaction_id: "pay_Nzk1004",
            payment_link_id: "plink_seed04",
            customer_name: "Meera Nair",
            customer_email: "meera.nair@example.com",
            customer_phone: "+919876500004",
            amount_inr: 3450,
            failure_code: "GATEWAY_ERROR",
            status: "RECOVERED",
            recovery_link: "https://rzp.io/rzp/seed04",
            retry_count: 1,
            channel_messages: JSON.stringify({
                whatsapp: "Hi Meera, gateway connectivity interrupted your ₹3,450 payment. Finish in 1 click: https://rzp.io/rzp/seed04",
                sms: "Gateway error on ₹3450 payment. Use quick link: https://rzp.io/rzp/seed04",
                email_subject: "Quick link to complete your pending transaction",
                email_body: "Hi Meera, a momentary gateway issue stopped your payment. Please retry here: https://rzp.io/rzp/seed04",
            }),
            created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
            recovered_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
            id: "tx_seed_5",
            transaction_id: "pay_Nzk1005",
            payment_link_id: null,
            customer_name: "Karan Johar",
            customer_email: "karan.j@example.com",
            customer_phone: "+919876500005",
            amount_inr: 12000,
            failure_code: "GATEWAY_ERROR",
            status: "MAX_RETRIES_EXCEEDED",
            recovery_link: null,
            retry_count: 3,
            channel_messages: null,
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
            recovered_at: null,
        },
    ];

    const insertTx = db.prepare(`
    INSERT INTO transactions (
      id, transaction_id, payment_link_id, customer_name, customer_email, customer_phone,
      amount_inr, failure_code, status, recovery_link, retry_count, channel_messages, created_at, recovered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const insertLog = db.prepare(`
    INSERT INTO audit_logs (transaction_id, node_name, message, created_at)
    VALUES (?, ?, ?, ?)
  `);

    for (const tx of seedTransactions) {
        insertTx.run(
            tx.id,
            tx.transaction_id,
            tx.payment_link_id,
            tx.customer_name,
            tx.customer_email,
            tx.customer_phone,
            tx.amount_inr,
            tx.failure_code,
            tx.status,
            tx.recovery_link,
            tx.retry_count,
            tx.channel_messages,
            tx.created_at,
            tx.recovered_at
        );

        insertLog.run(tx.transaction_id, "CLASSIFIER", `Decline code '${tx.failure_code}' processed`, tx.created_at);
        if (tx.recovery_link) {
            insertLog.run(tx.transaction_id, "RZP_LINK", `Generated recovery link: ${tx.recovery_link}`, tx.created_at);
            insertLog.run(tx.transaction_id, "LLM_OUTREACH", `Generated multi-channel recovery copy via Groq AI`, tx.created_at);
        }
        if (tx.status === "RECOVERED") {
            insertLog.run(tx.transaction_id, "SETTLEMENT", `Payment link settled successfully for ₹${tx.amount_inr}`, tx.recovered_at);
        }
    }
};

seedDataIfEmpty();

// Database Access Methods
export const dbOperations = {
    saveTransaction(tx) {
        const stmt = db.prepare(`
      INSERT INTO transactions (
        id, transaction_id, payment_link_id, customer_name, customer_email, customer_phone,
        amount_inr, failure_code, status, recovery_link, retry_count, channel_messages, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(transaction_id) DO UPDATE SET
        payment_link_id = COALESCE(excluded.payment_link_id, transactions.payment_link_id),
        status = excluded.status,
        recovery_link = excluded.recovery_link,
        retry_count = excluded.retry_count,
        channel_messages = excluded.channel_messages,
        updated_at = datetime('now')
    `);

        const id = tx.id || `recov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        stmt.run(
            id,
            tx.transactionId,
            tx.paymentLinkId || tx.payment_link_id || null,
            tx.customerName || "Valued Customer",
            tx.customerEmail || "customer@example.com",
            tx.customerPhone || "+919876543210",
            tx.amountInr || 0,
            tx.failureCode || "UNKNOWN",
            tx.status || "INITIATED",
            tx.recoveryLink || null,
            tx.retryCount || 0,
            typeof tx.channelMessages === "object" ? JSON.stringify(tx.channelMessages) : tx.channelMessages || null
        );

        return id;
    },

    addAuditLog(transactionId, nodeName, message) {
        const stmt = db.prepare(`
      INSERT INTO audit_logs (transaction_id, node_name, message, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `);
        stmt.run(transactionId, nodeName, message);
    },

    getTransactions({ search, status, limit = 50, offset = 0 } = {}) {
        let query = `SELECT * FROM transactions WHERE 1=1`;
        const params = [];

        if (status && status !== "ALL") {
            query += ` AND status = ?`;
            params.push(status);
        }

        if (search) {
            query += ` AND (transaction_id LIKE ? OR customer_email LIKE ? OR customer_name LIKE ? OR payment_link_id LIKE ? OR recovery_link LIKE ?)`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const rows = db.prepare(query).all(...params);
        return rows.map((r) => ({
            ...r,
            channel_messages: r.channel_messages ? JSON.parse(r.channel_messages) : null,
        }));
    },

    getActiveRecoveryTransactions() {
        const rows = db.prepare(`
          SELECT * FROM transactions 
          WHERE status = 'RECOVERY_SENT' AND (payment_link_id IS NOT NULL OR recovery_link IS NOT NULL)
        `).all();
        return rows.map((r) => ({
            ...r,
            channel_messages: r.channel_messages ? JSON.parse(r.channel_messages) : null,
        }));
    },

    getTransactionById(identifier) {
        const tx = db.prepare(`
          SELECT * FROM transactions 
          WHERE transaction_id = ? OR id = ? OR payment_link_id = ? OR recovery_link = ?
        `).get(identifier, identifier, identifier, identifier);
        
        if (!tx) return null;

        const auditLogs = db.prepare(`SELECT * FROM audit_logs WHERE transaction_id = ? ORDER BY id ASC`).all(tx.transaction_id);

        return {
            ...tx,
            channel_messages: tx.channel_messages ? JSON.parse(tx.channel_messages) : null,
            auditLogs,
        };
    },

    resolveTransaction(identifier, paymentDetails = {}) {
        const tx = db.prepare(`
          SELECT * FROM transactions 
          WHERE transaction_id = ? OR id = ? OR payment_link_id = ? OR recovery_link = ?
        `).get(identifier, identifier, identifier, identifier);

        if (!tx) return null;

        // If already recovered, return early
        if (tx.status === "RECOVERED") {
            return this.getTransactionById(tx.transaction_id);
        }

        db.prepare(`
          UPDATE transactions
          SET status = 'RECOVERED', recovered_at = datetime('now'), updated_at = datetime('now')
          WHERE transaction_id = ?
        `).run(tx.transaction_id);

        const logMsg = paymentDetails.paymentId 
            ? `SETTLEMENT: Payment captured (${paymentDetails.paymentId}) via link ${tx.recovery_link || tx.payment_link_id}. ₹${tx.amount_inr} recovered.`
            : `SETTLEMENT: Payment link confirmed paid via Razorpay. ₹${tx.amount_inr} revenue recovered successfully! 🎉`;

        db.prepare(`
          INSERT INTO audit_logs (transaction_id, node_name, message, created_at)
          VALUES (?, 'SETTLEMENT', ?, datetime('now'))
        `).run(tx.transaction_id, logMsg);

        return this.getTransactionById(tx.transaction_id);
    },

    getAnalytics() {
        const totalFailedRevenue = db.prepare(`SELECT COALESCE(SUM(amount_inr), 0) as total FROM transactions`).get().total;
        const totalRecoveredRevenue = db.prepare(`SELECT COALESCE(SUM(amount_inr), 0) as total FROM transactions WHERE status = 'RECOVERED'`).get().total;
        const totalPendingRecovery = db.prepare(`SELECT COALESCE(SUM(amount_inr), 0) as total FROM transactions WHERE status = 'RECOVERY_SENT'`).get().total;
        const totalEscalated = db.prepare(`SELECT COALESCE(SUM(amount_inr), 0) as total FROM transactions WHERE status IN ('HARD_DECLINE', 'ESCALATED_HARD_DECLINE', 'MAX_RETRIES_EXCEEDED')`).get().total;

        const totalTransactions = db.prepare(`SELECT COUNT(*) as count FROM transactions`).get().count;
        const recoveredCount = db.prepare(`SELECT COUNT(*) as count FROM transactions WHERE status = 'RECOVERED'`).get().count;
        const recoverySentCount = db.prepare(`SELECT COUNT(*) as count FROM transactions WHERE status = 'RECOVERY_SENT'`).get().count;
        const escalatedCount = db.prepare(`SELECT COUNT(*) as count FROM transactions WHERE status IN ('HARD_DECLINE', 'ESCALATED_HARD_DECLINE', 'MAX_RETRIES_EXCEEDED')`).get().count;

        const recoveryRate = totalTransactions > 0 ? ((recoveredCount / totalTransactions) * 100).toFixed(1) : "0.0";
        const projectedRoi = (totalRecoveredRevenue * 0.98).toFixed(0);

        const statusBreakdown = db.prepare(`
          SELECT status, COUNT(*) as count, COALESCE(SUM(amount_inr), 0) as total_amount
          FROM transactions
          GROUP BY status
        `).all();

        const failureCodeBreakdown = db.prepare(`
          SELECT failure_code, COUNT(*) as count, COALESCE(SUM(amount_inr), 0) as total_amount
          FROM transactions
          GROUP BY failure_code
          ORDER BY count DESC
          LIMIT 6
        `).all();

        const recentLogs = db.prepare(`
          SELECT a.*, t.amount_inr, t.customer_name
          FROM audit_logs a
          LEFT JOIN transactions t ON a.transaction_id = t.transaction_id
          ORDER BY a.id DESC
          LIMIT 12
        `).all();

        return {
            totalFailedRevenue,
            totalRecoveredRevenue,
            totalPendingRecovery,
            totalEscalated,
            totalTransactions,
            recoveredCount,
            recoverySentCount,
            escalatedCount,
            recoveryRate,
            projectedRoi,
            statusBreakdown,
            failureCodeBreakdown,
            recentLogs,
        };
    },

    getGuardrailSettings() {
        const rows = db.prepare(`SELECT * FROM guardrail_settings`).all();
        const settings = {};
        for (const row of rows) {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        }
        return settings;
    },

    updateGuardrailSettings(newSettings) {
        const update = db.prepare(`
          INSERT INTO guardrail_settings (key, value)
          VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `);

        for (const [key, value] of Object.entries(newSettings)) {
            const valStr = typeof value === "object" ? JSON.stringify(value) : String(value);
            update.run(key, valStr);
        }

        return this.getGuardrailSettings();
    },
};

export default db;
