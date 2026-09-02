import { recoveryAgent } from "./src/agent/index.js";

const testCases = [
    {
        id: "TC-01",
        title: "Soft Decline (Payment Timed Out) - Full Recovery Flow",
        description: "Standard soft decline scenario. Agent should create payment link and generate LLM outreach message.",
        input: {
            transactionId: "pay_TC001_TIME_OUT",
            failureCode: "BAD_REQUEST_PAYMENT_TIMED_OUT",
            customerEmail: "rahul.sharma@example.com",
            amountInr: 1250,
            retryCount: 0,
            status: "INITIATED",
        },
        expected: {
            status: "RECOVERY_SENT",
            shouldHaveLink: true,
            shouldHaveOutreach: true,
            expectedRetryCount: 1,
        },
    },
    {
        id: "TC-02",
        title: "Soft Decline (Insufficient Funds) - High Value Recovery",
        description: "Customer had insufficient funds. Agent should generate payment link and customized recovery message.",
        input: {
            transactionId: "pay_TC002_INSUFFICIENT",
            failureCode: "INSUFFICIENT_FUNDS",
            customerEmail: "priya.patel@example.com",
            amountInr: 15499,
            retryCount: 1,
            status: "INITIATED",
        },
        expected: {
            status: "RECOVERY_SENT",
            shouldHaveLink: true,
            shouldHaveOutreach: true,
            expectedRetryCount: 2,
        },
    },
    {
        id: "TC-03",
        title: "Hard Decline (Card Stolen / Fraud) - Guardrail Escalation",
        description: "Security/fraud decline. Guardrail should block recovery link and halt execution.",
        input: {
            transactionId: "pay_TC003_FRAUD",
            failureCode: "CARD_STOLEN_OR_FRAUD",
            customerEmail: "suspicious.user@example.com",
            amountInr: 45000,
            retryCount: 0,
            status: "INITIATED",
        },
        expected: {
            status: "HARD_DECLINE",
            shouldHaveLink: false,
            shouldHaveOutreach: false,
            expectedRetryCount: 0,
        },
    },
    {
        id: "TC-04",
        title: "Hard Decline (Invalid Account / Blocked Card)",
        description: "Permanent failure code. Agent should classify as HARD_DECLINE and immediately escalate/stop.",
        input: {
            transactionId: "pay_TC004_INVALID_ACC",
            failureCode: "INVALID_ACCOUNT_DETAILS",
            customerEmail: "vikram.mehta@example.com",
            amountInr: 3200,
            retryCount: 0,
            status: "INITIATED",
        },
        expected: {
            status: "HARD_DECLINE",
            shouldHaveLink: false,
            shouldHaveOutreach: false,
            expectedRetryCount: 0,
        },
    },
    {
        id: "TC-05",
        title: "Max Retry Limit Exceeded (Retry Count >= 3)",
        description: "Soft decline code but retry limit already reached. Guardrail should abort further retries.",
        input: {
            transactionId: "pay_TC005_MAX_RETRY",
            failureCode: "GATEWAY_ERROR",
            customerEmail: "ananya.singh@example.com",
            amountInr: 2100,
            retryCount: 3,
            status: "INITIATED",
        },
        expected: {
            status: "SOFT_DECLINE",
            shouldHaveLink: false,
            shouldHaveOutreach: false,
            expectedRetryCount: 3,
        },
    },
];

async function runTestSuite() {
    console.log("================================================================================");
    console.log("             🤖 RECOV-AI AGENT COMPREHENSIVE TEST SUITE                         ");
    console.log("================================================================================\n");

    let passedCount = 0;

    for (const [index, tc] of testCases.entries()) {
        console.log(`--------------------------------------------------------------------------------`);
        console.log(`[${tc.id}] Test ${index + 1}/${testCases.length}: ${tc.title}`);
        console.log(`Description: ${tc.description}`);
        console.log(`Input:`, JSON.stringify(tc.input, null, 2));

        try {
            const startTime = Date.now();
            const result = await recoveryAgent.invoke(tc.input);
            const durationMs = Date.now() - startTime;

            console.log(`\nExecution Time: ${durationMs}ms`);
            console.log(`Final Status: ${result.status}`);
            console.log(`Recovery Link: ${result.recoveryLink || "(None - Blocked by Guardrail)"}`);
            if (result.outreachMessage) {
                console.log(`Outreach Message:\n${result.outreachMessage.trim()}`);
            } else {
                console.log(`Outreach Message: (None - Not Generated)`);
            }

            console.log(`Audit Trail:`);
            (result.auditLog || []).forEach((log) => console.log(`  • ${log}`));

            // Assertions
            const statusMatch = result.status === tc.expected.status;
            const linkMatch = tc.expected.shouldHaveLink ? Boolean(result.recoveryLink) : !result.recoveryLink;
            const outreachMatch = tc.expected.shouldHaveOutreach ? Boolean(result.outreachMessage) : !result.outreachMessage;
            const retryMatch = result.retryCount === tc.expected.expectedRetryCount;

            const passed = statusMatch && linkMatch && outreachMatch && retryMatch;

            if (passed) {
                passedCount++;
                console.log(`\n Result: PASSED ✅`);
            } else {
                console.log(`\n Result: FAILED ❌`);
                if (!statusMatch) console.log(`  - Status mismatch: expected ${tc.expected.status}, got ${result.status}`);
                if (!linkMatch) console.log(`  - Link mismatch: expected link=${tc.expected.shouldHaveLink}, got ${result.recoveryLink}`);
                if (!outreachMatch) console.log(`  - Outreach mismatch: expected outreach=${tc.expected.shouldHaveOutreach}`);
                if (!retryMatch) console.log(`  - RetryCount mismatch: expected ${tc.expected.expectedRetryCount}, got ${result.retryCount}`);
            }
        } catch (error) {
            console.error(`\n Result: ERROR ❌ - ${error.message}`);
        }
        console.log("\n");
    }

    console.log("================================================================================");
    console.log(`TEST SUMMARY: ${passedCount}/${testCases.length} Tests Passed (${Math.round((passedCount / testCases.length) * 100)}%)`);
    console.log("================================================================================\n");
}

runTestSuite();