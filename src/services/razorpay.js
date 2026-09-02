import Razorpay from "razorpay";
import config from "../config/env.js";

/**
 * Shared Razorpay client singleton.
 * Falls back to a dummy instance if credentials are not configured,
 * so the app can still run in demo/mock mode.
 */
let rzpInstance = null;

export function getRazorpayClient() {
    if (!rzpInstance) {
        if (config.razorpay.isConfigured) {
            rzpInstance = new Razorpay({
                key_id: config.razorpay.keyId,
                key_secret: config.razorpay.keySecret,
            });
        } else {
            console.warn("⚠️  Razorpay credentials not configured — running in mock mode.");
            rzpInstance = null;
        }
    }
    return rzpInstance;
}

/**
 * Synchronizes active payment links with Razorpay to detect
 * customer payments that happened outside of webhooks.
 *
 * @param {object} dbOperations — database operations module
 * @param {function} broadcastSSE — SSE broadcast function
 */
export async function syncActivePaymentLinks(dbOperations, broadcastSSE) {
    const rzp = getRazorpayClient();
    if (!rzp) return;

    try {
        const activeTxs = dbOperations.getActiveRecoveryTransactions();
        if (!activeTxs || activeTxs.length === 0) return;

        for (const tx of activeTxs) {
            let plinkId = tx.payment_link_id;

            // If payment_link_id is missing but short_url or recovery_link is available
            if (!plinkId && tx.recovery_link) {
                const match = tx.recovery_link.match(/plink_[a-zA-Z0-9]+/);
                if (match) plinkId = match[0];
            }

            if (plinkId && !plinkId.startsWith("plink_mock_") && !plinkId.startsWith("plink_seed")) {
                try {
                    const fetchedLink = await rzp.paymentLink.fetch(plinkId);
                    if (fetchedLink && fetchedLink.status === "paid") {
                        console.log(`\n🎉 [AUTO-SYNC] Payment link ${plinkId} for Tx ${tx.transaction_id} is PAID! Updating to RECOVERED...`);

                        const resolved = dbOperations.resolveTransaction(tx.transaction_id, {
                            paymentId: fetchedLink.payments?.[0]?.payment_id || `pay_${Date.now()}`,
                        });

                        broadcastSSE("transaction_resolved", {
                            transaction: resolved,
                            analytics: dbOperations.getAnalytics(),
                            source: "razorpay_sync",
                        });
                    }
                } catch (_fetchErr) {
                    // Ignore non-existent or rate-limited links silently
                }
            }
        }
    } catch (err) {
        console.error("Auto-sync error:", err.message);
    }
}

export default getRazorpayClient;
