import { Router } from "express";
import { recoveryAgent } from "../agent/index.js";
import { dbOperations } from "../db/index.js";
import { asyncHandler } from "../middleware/errorHandler.js";

/**
 * Demo e-commerce store routes.
 * Provides mock products and a checkout flow that intentionally
 * triggers a payment failure to demonstrate RecovAI in action.
 *
 * @param {function} broadcastSSE — SSE broadcast helper from server.js
 */
export function createDemoRouter(broadcastSSE) {
    const router = Router();

    // Mock product catalog
    const PRODUCTS = [
        {
            id: "prod_001",
            name: "Wireless Noise-Cancelling Headphones",
            description: "Premium ANC headphones with 40hr battery life, Hi-Res Audio, and adaptive noise cancellation for immersive listening.",
            price: 4999,
            category: "Electronics",
            rating: 4.7,
            reviews: 1284,
            badge: "Bestseller",
            emoji: "🎧",
        },
        {
            id: "prod_002",
            name: "Premium Leather Laptop Sleeve",
            description: "Handcrafted Italian leather sleeve with microfiber lining. Fits 13–15\" laptops with magnetic closure.",
            price: 2499,
            category: "Accessories",
            rating: 4.5,
            reviews: 856,
            badge: null,
            emoji: "💼",
        },
        {
            id: "prod_003",
            name: "Smart Fitness Band Pro",
            description: "Advanced health tracker with AMOLED display, SpO2, heart rate, sleep analysis, and 14-day battery.",
            price: 3299,
            category: "Wearables",
            rating: 4.6,
            reviews: 2103,
            badge: "New",
            emoji: "⌚",
        },
        {
            id: "prod_004",
            name: "Organic Cotton Hoodie",
            description: "Sustainably sourced 100% organic cotton hoodie with minimalist design. Breathable and ultra-comfortable.",
            price: 1899,
            category: "Fashion",
            rating: 4.4,
            reviews: 673,
            badge: null,
            emoji: "👕",
        },
        {
            id: "prod_005",
            name: "Portable Bluetooth Speaker",
            description: "IPX7 waterproof speaker with 360° surround sound, 20hr playtime, and USB-C fast charging.",
            price: 2199,
            category: "Electronics",
            rating: 4.5,
            reviews: 1567,
            badge: "Popular",
            emoji: "🔊",
        },
        {
            id: "prod_006",
            name: "Minimalist Analog Watch",
            description: "Japanese quartz movement, sapphire crystal glass, genuine leather strap. Timeless elegant design.",
            price: 5499,
            category: "Accessories",
            rating: 4.8,
            reviews: 421,
            badge: "Premium",
            emoji: "⏱️",
        },
    ];

    // GET /api/v1/demo/products — return product catalog
    router.get("/products", (_req, res) => {
        res.json({ success: true, data: PRODUCTS });
    });

    // POST /api/v1/demo/checkout — simulate checkout → payment failure → RecovAI recovery
    router.post("/checkout", asyncHandler(async (req, res) => {
        const {
            items = [],
            customerName = "Demo Customer",
            customerEmail = "demo@recovai.store",
            customerPhone = "+919876543210",
            failureCode = "BAD_REQUEST_PAYMENT_TIMED_OUT",
        } = req.body;

        // Calculate total from cart items
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = PRODUCTS.find((p) => p.id === item.productId);
            if (product) {
                const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
                totalAmount += product.price * qty;
                orderItems.push({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: qty,
                    subtotal: product.price * qty,
                });
            }
        }

        if (orderItems.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Cart is empty — add at least one product before checkout.",
            });
        }

        const transactionId = `pay_demo_${Date.now()}`;

        // Simulate the payment failure and invoke RecovAI agent
        const initialState = {
            transactionId,
            failureCode,
            customerName,
            customerEmail,
            customerPhone,
            amountInr: totalAmount,
            retryCount: 0,
            status: "INITIATED",
        };

        console.log(`\n🛒 [DEMO STORE] Checkout initiated — ₹${totalAmount} (${orderItems.length} items)`);
        console.log(`   Customer: ${customerName} (${customerEmail})`);
        console.log(`   Simulating failure: ${failureCode}`);

        const result = await recoveryAgent.invoke(initialState);
        const detailedTx = dbOperations.getTransactionById(result.transactionId || transactionId);

        broadcastSSE("recovery_executed", {
            transaction: detailedTx,
            analytics: dbOperations.getAnalytics(),
            source: "demo_store",
        });

        res.json({
            success: true,
            order: {
                transactionId,
                items: orderItems,
                totalAmount,
                customerName,
                customerEmail,
                failureCode,
            },
            recovery: result,
            transaction: detailedTx,
        });
    }));

    return router;
}
