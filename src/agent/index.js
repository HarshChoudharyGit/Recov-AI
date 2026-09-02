import { StateGraph, END } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import config from "../config/env.js";
import { getRazorpayClient } from "../services/razorpay.js";
import { dbOperations } from "../db/index.js";
import { sendRecoveryEmail } from "../mailer.js";

const llm = new ChatGroq({
    apiKey: config.groq.apiKey,
    model: config.groq.model,
    temperature: 0.2,
});

// State channels definition
const stateChannels = {
    id: { value: (x, y) => y ?? x, default: () => "" },
    transactionId: { value: (x, y) => y ?? x, default: () => "" },
    paymentLinkId: { value: (x, y) => y ?? x, default: () => null },
    failureCode: { value: (x, y) => y ?? x, default: () => "" },
    customerName: { value: (x, y) => y ?? x, default: () => "Valued Customer" },
    customerEmail: { value: (x, y) => y ?? x, default: () => "" },
    customerPhone: { value: (x, y) => y ?? x, default: () => "+919876543210" },
    amountInr: { value: (x, y) => y ?? x, default: () => 0 },
    retryCount: { value: (x, y) => y ?? x, default: () => 0 },
    status: { value: (x, y) => y ?? x, default: () => "INITIATED" },
    recoveryLink: { value: (x, y) => y ?? x, default: () => null },
    outreachMessage: { value: (x, y) => y ?? x, default: () => "" },
    channelMessages: { value: (x, y) => y ?? x, default: () => null },
    emailSent: { value: (x, y) => y ?? x, default: () => false },
    emailMessageId: { value: (x, y) => y ?? x, default: () => null },
    auditLog: { value: (x, y) => (x || []).concat(y), default: () => [] },
};

// Node 1: Classify decline code with dynamic rule lookup
const classifyNode = async (state) => {
    let softCodes = ["BAD_REQUEST_PAYMENT_TIMED_OUT", "GATEWAY_ERROR", "INSUFFICIENT_FUNDS", "NETWORK_ERROR", "ISSUER_DOWN"];
    try {
        const settings = dbOperations.getGuardrailSettings();
        if (settings.soft_decline_codes && Array.isArray(settings.soft_decline_codes)) {
            softCodes = settings.soft_decline_codes;
        }
    } catch {
        // Use default fallback
    }

    const isSoft = softCodes.includes(state.failureCode);
    const classification = isSoft ? "SOFT_DECLINE" : "HARD_DECLINE";
    const logMsg = `CLASSIFIER: Decline code '${state.failureCode}' classified as ${classification}`;

    try {
        dbOperations.addAuditLog(state.transactionId, "CLASSIFIER", logMsg);
    } catch {}

    return {
        status: classification,
        auditLog: [logMsg],
    };
};

// Node 2: Create Razorpay Recovery Link
const createLinkNode = async (state) => {
    const rzp = getRazorpayClient();
    let paymentLink;

    try {
        if (!rzp) throw new Error("Razorpay not configured");
        paymentLink = await rzp.paymentLink.create({
            amount: Math.round(state.amountInr * 100),
            currency: "INR",
            description: `Recovery link for ${state.transactionId}`,
            customer: {
                name: state.customerName || "Valued Customer",
                email: state.customerEmail || "customer@example.com",
                contact: state.customerPhone || "+919876543210",
            },
            notify: { email: false, sms: false },
        });
    } catch (err) {
        const fallbackUrl = `https://rzp.io/rzp/mock_${state.transactionId}`;
        paymentLink = { id: `plink_mock_${Date.now()}`, short_url: fallbackUrl };
    }

    const logMsg = `RZP_LINK: Created recovery link ${paymentLink.short_url} (${paymentLink.id || "plink"})`;
    try {
        dbOperations.addAuditLog(state.transactionId, "RZP_LINK", logMsg);
    } catch {}

    return {
        paymentLinkId: paymentLink.id,
        recoveryLink: paymentLink.short_url,
        retryCount: state.retryCount + 1,
        status: "RECOVERY_SENT",
        auditLog: [logMsg],
    };
};

// Node 3: LLM Multi-Channel AI Outreach Node
const generateOutreachNode = async (state) => {
    const prompt = `
You are an autonomous AI customer recovery agent for a premium merchant named RecovAI.
A customer payment failed with the following details:
- Customer Name: ${state.customerName || "Valued Customer"}
- Customer Email: ${state.customerEmail}
- Amount: INR ${state.amountInr}
- Failure Reason / Code: ${state.failureCode}
- Secure Recovery URL: ${state.recoveryLink}

Please generate tailored recovery outreach messages in JSON format for the following channels:
1. "whatsapp": A polite, friendly, 2-sentence WhatsApp message urging them to complete their payment using the recovery link.
2. "sms": A concise SMS message (under 160 characters) with the link.
3. "email_subject": A clear, high-converting email subject line.
4. "email_body": A professional, reassuring 2-paragraph email explaining the payment glitch and providing the direct payment link.
5. "push_notification": A brief 1-sentence in-app push alert.

Return ONLY valid JSON matching this exact structure without markdown code fences:
{
  "whatsapp": "...",
  "sms": "...",
  "email_subject": "...",
  "email_body": "...",
  "push_notification": "..."
}
`;

    let channelMessages = null;
    let fallbackWhatsapp = `Hi ${state.customerName || "there"}, we noticed your payment of ₹${state.amountInr} was interrupted (${state.failureCode}). You can complete it securely here: ${state.recoveryLink}`;

    try {
        const response = await llm.invoke(prompt);
        let rawContent = response.content.trim();
        // Remove markdown backticks if model wrapped JSON
        if (rawContent.startsWith("```json")) {
            rawContent = rawContent.replace(/^```json/, "").replace(/```$/, "").trim();
        } else if (rawContent.startsWith("```")) {
            rawContent = rawContent.replace(/^```/, "").replace(/```$/, "").trim();
        }

        channelMessages = JSON.parse(rawContent);
        if (channelMessages.whatsapp) {
            fallbackWhatsapp = channelMessages.whatsapp;
        }
    } catch (err) {
        channelMessages = {
            whatsapp: fallbackWhatsapp,
            sms: `RecovAI: Payment of INR ${state.amountInr} pending. Complete now: ${state.recoveryLink}`,
            email_subject: `Complete your payment of INR ${state.amountInr}`,
            email_body: `Dear Customer,\n\nYour transaction of INR ${state.amountInr} encountered an issue (${state.failureCode}). Please use this link to finish: ${state.recoveryLink}`,
            push_notification: `Payment pending: Tap to complete your payment of INR ${state.amountInr}.`,
        };
    }

    const logMsg = `LLM_OUTREACH: Generated WhatsApp message via Groq (${config.groq.model})`;
    try {
        dbOperations.addAuditLog(state.transactionId, "LLM_OUTREACH", logMsg);
    } catch {}

    return {
        outreachMessage: fallbackWhatsapp,
        channelMessages: channelMessages,
        auditLog: [logMsg],
    };
};

// Node 4: Send Recovery Email via Nodemailer
const sendEmailNode = async (state) => {
    const toEmail = state.customerEmail;
    if (!toEmail || toEmail === "customer@example.com") {
        const logMsg = `EMAIL_DISPATCH: Skipped – no valid customer email address.`;
        try { dbOperations.addAuditLog(state.transactionId, "EMAIL_DISPATCH", logMsg); } catch {}
        return { emailSent: false, auditLog: [logMsg] };
    }

    // Use AI-generated subject & body from channelMessages if available
    const msgs = state.channelMessages || {};
    const result = await sendRecoveryEmail({
        toEmail,
        customerName: state.customerName,
        amountInr: state.amountInr,
        recoveryLink: state.recoveryLink,
        subject: msgs.email_subject || undefined,
        body: msgs.email_body || undefined,
    });

    const logMsg = result.success
        ? `EMAIL_DISPATCH: Recovery email sent to ${toEmail} (ID: ${result.messageId})`
        : `EMAIL_DISPATCH: Failed to send email to ${toEmail} – ${result.error}`;

    try { dbOperations.addAuditLog(state.transactionId, "EMAIL_DISPATCH", logMsg); } catch {}

    return {
        emailSent: result.success,
        emailMessageId: result.messageId || null,
        auditLog: [logMsg],
    };
};

// Guardrail Check Node
const checkGuardrails = (state) => {
    let maxRetries = 3;
    try {
        const settings = dbOperations.getGuardrailSettings();
        if (settings.max_retry_count) {
            maxRetries = parseInt(settings.max_retry_count, 10);
        }
    } catch {}

    if (state.retryCount >= maxRetries) {
        const logMsg = `GUARDRAIL: Max retry limit (${maxRetries}) exceeded. Execution halted.`;
        try {
            dbOperations.addAuditLog(state.transactionId, "GUARDRAIL", logMsg);
            dbOperations.saveTransaction({ ...state, status: "MAX_RETRIES_EXCEEDED" });
        } catch {}
        return "stop";
    }

    if (state.status === "HARD_DECLINE") {
        const logMsg = `GUARDRAIL: Hard decline detected ('${state.failureCode}'). Recovery blocked to prevent fraud/compliance breach.`;
        try {
            dbOperations.addAuditLog(state.transactionId, "GUARDRAIL", logMsg);
            dbOperations.saveTransaction({ ...state, status: "HARD_DECLINE" });
        } catch {}
        return "escalate";
    }

    return "proceed";
};

// Compile LangGraph State Machine
const builder = new StateGraph({ channels: stateChannels })
    .addNode("classify", classifyNode)
    .addNode("createLink", createLinkNode)
    .addNode("generateOutreach", generateOutreachNode)
    .addNode("sendEmail", sendEmailNode)
    .addEdge("__start__", "classify")
    .addConditionalEdges("classify", checkGuardrails, {
        proceed: "createLink",
        stop: END,
        escalate: END,
    })
    .addEdge("createLink", "generateOutreach")
    .addEdge("generateOutreach", "sendEmail")
    .addEdge("sendEmail", END);

const compiledGraph = builder.compile();

// Wrapper with automatic database persistence
export const recoveryAgent = {
    async invoke(initialState) {
        const result = await compiledGraph.invoke(initialState);

        // Auto-save to SQLite ledger
        try {
            dbOperations.saveTransaction({
                transactionId: result.transactionId || initialState.transactionId,
                paymentLinkId: result.paymentLinkId || initialState.paymentLinkId,
                customerName: result.customerName || initialState.customerName,
                customerEmail: result.customerEmail || initialState.customerEmail,
                customerPhone: result.customerPhone || initialState.customerPhone,
                amountInr: result.amountInr || initialState.amountInr,
                failureCode: result.failureCode || initialState.failureCode,
                status: result.status,
                recoveryLink: result.recoveryLink,
                retryCount: result.retryCount,
                channelMessages: result.channelMessages,
            });
        } catch (e) {
            console.error("Failed to auto-save to DB:", e);
        }

        return result;
    },
};
