import { Router } from "express";
import { recoveryAgent } from "../agent/index.js";
import { dbOperations } from "../db/index.js";
import { sendRecoveryEmail } from "../mailer.js";
import { syncActivePaymentLinks } from "../services/razorpay.js";
import { asyncHandler } from "../middleware/errorHandler.js";

/**
 * Core RecovAI API routes.
 * @param {function} broadcastSSE — SSE broadcast helper from server.js
 */
export function createApiRouter(broadcastSSE) {
    const router = Router();

    // Manual Sync Trigger
    router.get("/sync-razorpay", asyncHandler(async (_req, res) => {
        await syncActivePaymentLinks(dbOperations, broadcastSSE);
        res.json({ success: true, analytics: dbOperations.getAnalytics() });
    }));

    // Analytics & KPI Metrics
    router.get("/analytics", (_req, res) => {
        const analytics = dbOperations.getAnalytics();
        res.json({ success: true, data: analytics });
    });

    // Transactions Ledger (Search & Filter)
    router.get("/transactions", (req, res) => {
        const { search, status, limit, offset } = req.query;
        const transactions = dbOperations.getTransactions({
            search,
            status,
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
        });
        res.json({ success: true, data: transactions });
    });

    // Single Transaction Details with Audit Trail
    router.get("/transactions/:id", (req, res) => {
        const tx = dbOperations.getTransactionById(req.params.id);
        if (!tx) {
            return res.status(404).json({ success: false, error: "Transaction not found" });
        }
        res.json({ success: true, data: tx });
    });

    // Simulate Razorpay Webhook or Manual Payment Failure
    router.post("/simulate", asyncHandler(async (req, res) => {
        const {
            transactionId = `pay_sim_${Date.now()}`,
            failureCode = "BAD_REQUEST_PAYMENT_TIMED_OUT",
            customerName = "Rahul Sharma",
            customerEmail = "rahul.sharma@example.com",
            customerPhone = "+919876512345",
            amountInr = 1499,
            retryCount = 0,
        } = req.body;

        const initialState = {
            transactionId,
            failureCode,
            customerName,
            customerEmail,
            customerPhone,
            amountInr: parseFloat(amountInr),
            retryCount: parseInt(retryCount, 10),
            status: "INITIATED",
        };

        const result = await recoveryAgent.invoke(initialState);
        const detailedTx = dbOperations.getTransactionById(result.transactionId || initialState.transactionId);

        broadcastSSE("recovery_executed", {
            transaction: detailedTx,
            analytics: dbOperations.getAnalytics(),
        });

        res.json({ success: true, data: result, transaction: detailedTx });
    }));

    // Mark a Transaction as Paid / Recovered
    router.post("/transactions/:id/resolve", (req, res) => {
        const tx = dbOperations.resolveTransaction(req.params.id, {
            paymentId: req.body?.paymentId || `pay_manual_${Date.now()}`,
        });
        if (!tx) {
            return res.status(404).json({ success: false, error: "Transaction not found" });
        }

        broadcastSSE("transaction_resolved", {
            transaction: tx,
            analytics: dbOperations.getAnalytics(),
            source: "manual_or_customer_action",
        });

        res.json({ success: true, data: tx });
    });

    // Send Recovery Email for a Transaction
    router.post("/transactions/:id/send-email", asyncHandler(async (req, res) => {
        const tx = dbOperations.getTransactionById(req.params.id);
        if (!tx) {
            return res.status(404).json({ success: false, error: "Transaction not found" });
        }

        if (!tx.customer_email || tx.customer_email === "customer@example.com") {
            return res.status(400).json({ success: false, error: "No valid customer email on this transaction" });
        }

        if (!tx.recovery_link) {
            return res.status(400).json({ success: false, error: "No recovery link available for this transaction" });
        }

        // Use AI-generated channel copy if available
        const msgs = tx.channel_messages || {};

        const result = await sendRecoveryEmail({
            toEmail: tx.customer_email,
            customerName: tx.customer_name || "Valued Customer",
            amountInr: tx.amount_inr,
            recoveryLink: tx.recovery_link,
            subject: msgs.email_subject || undefined,
            body: msgs.email_body || undefined,
        });

        if (result.success) {
            dbOperations.addAuditLog(
                tx.transaction_id,
                "EMAIL_DISPATCH",
                `EMAIL_DISPATCH: Manual recovery email sent to ${tx.customer_email} (ID: ${result.messageId})`
            );
        }

        res.json({
            success: result.success,
            messageId: result.messageId || null,
            error: result.error || null,
            recipient: tx.customer_email,
        });
    }));

    // Guardrail Settings Configuration
    router.get("/guardrails", (_req, res) => {
        const settings = dbOperations.getGuardrailSettings();
        res.json({ success: true, data: settings });
    });

    router.post("/guardrails", (req, res) => {
        const updated = dbOperations.updateGuardrailSettings(req.body);
        broadcastSSE("guardrails_updated", { settings: updated });
        res.json({ success: true, data: updated });
    });

    // Razorpay Inbound Webhook Endpoint
    router.post("/razorpay-webhook", asyncHandler(async (req, res) => {
        const payload = req.body || {};
        const event = payload.event;

        // Acknowledge webhook immediately (standard Razorpay best practice)
        res.status(200).json({ status: "received" });

        console.log(`\n📥 [WEBHOOK RECEIVED] Event: ${event}`);

        if (event === "payment.failed") {
            const entity = payload.payload?.payment?.entity || {};

            const initialState = {
                transactionId: entity.id || `pay_rzp_${Date.now()}`,
                failureCode: entity.error_code || "BAD_REQUEST_PAYMENT_TIMED_OUT",
                customerName: entity.notes?.customer_name || "Valued Customer",
                customerEmail: entity.email || "customer@example.com",
                customerPhone: entity.contact || "+919876543210",
                amountInr: (entity.amount || 50000) / 100,
                retryCount: 0,
                status: "INITIATED",
            };

            try {
                const result = await recoveryAgent.invoke(initialState);
                const detailedTx = dbOperations.getTransactionById(result.transactionId);

                broadcastSSE("recovery_executed", {
                    transaction: detailedTx,
                    analytics: dbOperations.getAnalytics(),
                });

                console.log("--- RECOVERY AGENT EXECUTED FROM WEBHOOK ---");
                console.log("Transaction ID:", result.transactionId);
                console.log("Generated Link:", result.recoveryLink);
            } catch (err) {
                console.error("Agent execution error from webhook:", err);
            }
        } else if (
            event === "payment_link.paid" ||
            event === "payment.captured" ||
            event === "order.paid"
        ) {
            const plinkEntity = payload.payload?.payment_link?.entity;
            const paymentEntity = payload.payload?.payment?.entity;
            const orderEntity = payload.payload?.order?.entity;

            const identifiers = [
                plinkEntity?.id,
                plinkEntity?.short_url,
                paymentEntity?.id,
                paymentEntity?.description?.match(/pay_[a-zA-Z0-9_]+/)?.[0],
                orderEntity?.id,
            ].filter(Boolean);

            let resolvedTx = null;
            for (const id of identifiers) {
                resolvedTx = dbOperations.resolveTransaction(id, {
                    paymentId: paymentEntity?.id || plinkEntity?.id,
                });
                if (resolvedTx) break;
            }

            if (resolvedTx) {
                console.log(`✅ [WEBHOOK] Resolved & Recovered Transaction: ${resolvedTx.transaction_id} (₹${resolvedTx.amount_inr})`);
                broadcastSSE("transaction_resolved", {
                    transaction: resolvedTx,
                    analytics: dbOperations.getAnalytics(),
                    source: "razorpay_webhook",
                });
            }
        }
    }));

    return router;
}
