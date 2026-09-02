import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const rzp = new Razorpay({
    key_id: process.env.RZP_TEST_KEY_ID,
    key_secret: process.env.RZP_TEST_KEY_SECRET,
});

async function testPaymentLink() {
    try {
        const paymentLink = await rzp.paymentLink.create({
            amount: 50000, // ₹500 in paise
            currency: "INR",
            description: "Test Revenue Recovery Link",
            customer: {
                name: "Rahul Sharma",
                email: "rahul.test@example.com",
                contact: "+919876512345", // Use valid non-repeating contact
            },
            notify: {
                email: false,
                sms: false,
            },
        });

        console.log("\n SUCCESS! Razorpay API key verified.");
        console.log("Payment Link ID:", paymentLink.id);
        console.log("Short URL:", paymentLink.short_url);
    } catch (error) {
        console.error("\n ERROR! Verification failed:");
        console.error(error.error ? error.error.description : error);
    }
}

testPaymentLink();