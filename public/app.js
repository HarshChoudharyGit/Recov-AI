// RecovAI Front-End Application Logic & Data Visualizations
document.addEventListener("DOMContentLoaded", () => {
    // State management
    const state = {
        analytics: null,
        transactions: [],
        guardrails: null,
        activeTab: "tab-dashboard",
        activeChannel: "whatsapp",
        activeTxDrawer: null,
        lastSimulatedTx: null,
        charts: {},
        demoProducts: [],
        demoCart: [],
    };

    // DOM Elements
    const elements = {
        // Tabs
        navItems: document.querySelectorAll(".nav-item"),
        tabPanes: document.querySelectorAll(".tab-pane"),
        sidebar: document.querySelector(".sidebar"),
        mobileMenuToggle: document.getElementById("mobile-menu-toggle"),
        pageTitle: document.getElementById("page-title"),
        pageSubtitle: document.getElementById("page-subtitle"),
        
        // Buttons
        btnRefresh: document.getElementById("btn-refresh-data"),
        btnQuickSimulate: document.getElementById("btn-quick-simulate"),
        btnSyncRzp: document.getElementById("btn-sync-rzp"),
        
        // KPIs
        kpiRecoveredInr: document.getElementById("kpi-recovered-inr"),
        kpiRecoveredCount: document.getElementById("kpi-recovered-count"),
        kpiRecoveryRate: document.getElementById("kpi-recovery-rate"),
        kpiTotalTx: document.getElementById("kpi-total-tx"),
        kpiPendingInr: document.getElementById("kpi-pending-inr"),
        kpiPendingCount: document.getElementById("kpi-pending-count"),
        kpiEscalatedInr: document.getElementById("kpi-escalated-inr"),
        kpiEscalatedCount: document.getElementById("kpi-escalated-count"),
        
        // Containers
        failureDistList: document.getElementById("failure-distribution-list"),
        liveAuditFeed: document.getElementById("live-audit-feed"),
        transactionsTbody: document.getElementById("transactions-tbody"),
        ledgerSearch: document.getElementById("ledger-search"),
        ledgerStatusFilter: document.getElementById("ledger-status-filter"),
        
        // Simulation Form
        simForm: document.getElementById("simulation-form"),
        simName: document.getElementById("sim-name"),
        simEmail: document.getElementById("sim-email"),
        simAmount: document.getElementById("sim-amount"),
        simRetryCount: document.getElementById("sim-retry-count"),
        simFailureCode: document.getElementById("sim-failure-code"),
        simSpinner: document.getElementById("sim-spinner"),
        simBtnText: document.getElementById("sim-btn-text"),
        simResultBox: document.getElementById("sim-result-box"),
        simResStatusTitle: document.getElementById("sim-res-status-title"),
        simResBadge: document.getElementById("sim-res-badge"),
        simResLink: document.getElementById("sim-res-link"),
        simResMsg: document.getElementById("sim-res-msg"),
        resLinkRow: document.getElementById("res-link-row"),
        btnCopySimLink: document.getElementById("btn-copy-sim-link"),
        btnSimOpenLink: document.getElementById("btn-sim-open-link"),
        btnSimResolve: document.getElementById("btn-sim-resolve"),
        graphStatusBadge: document.getElementById("graph-status-badge"),
        
        // Studio Elements
        channelBtns: document.querySelectorAll(".channel-btn"),
        devicePanes: document.querySelectorAll(".device-preview-pane"),
        waPreviewText: document.getElementById("wa-preview-text"),
        waPreviewLink: document.getElementById("wa-preview-link"),
        smsPreviewText: document.getElementById("sms-preview-text"),
        emailPreviewSubject: document.getElementById("email-preview-subject"),
        emailPreviewBody: document.getElementById("email-preview-body"),
        emailPreviewBtn: document.getElementById("email-preview-btn"),
        pushPreviewText: document.getElementById("push-preview-text"),
        
        // Drawer Elements
        drawerOverlay: document.getElementById("drawer-overlay"),
        sideDrawer: document.getElementById("side-drawer"),
        btnCloseDrawer: document.getElementById("btn-close-drawer"),
        drawerTxTitle: document.getElementById("drawer-tx-title"),
        drawerStatusBadge: document.getElementById("drawer-status-badge"),
        drawerMetaGrid: document.getElementById("drawer-meta-grid"),
        drawerRecoveryLink: document.getElementById("drawer-recovery-link"),
        drawerLinkSection: document.getElementById("drawer-link-section"),
        drawerChannelCopy: document.getElementById("drawer-channel-copy"),
        drawerAuditList: document.getElementById("drawer-audit-list"),
        btnDrawerResolve: document.getElementById("btn-drawer-resolve"),
        btnDrawerSendEmail: document.getElementById("btn-drawer-send-email"),
        btnCopyDrawerLink: document.getElementById("btn-copy-drawer-link"),
        
        // Guardrails
        sliderMaxRetries: document.getElementById("setting-max-retries"),
        valMaxRetries: document.getElementById("val-max-retries"),
        inputVipThreshold: document.getElementById("setting-vip-threshold"),
        btnSaveGuardrails: document.getElementById("btn-save-guardrails"),
        
        // Toast & Canvas
        toastContainer: document.getElementById("toast-container"),
        confettiCanvas: document.getElementById("confetti-canvas"),
    };

    // Helper: Toast Notifications
    function showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${type === "success" ? "✓" : "ℹ"}</span> <span>${message}</span>`;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Helper: Currency Formatter
    function formatINR(val) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val || 0);
    }

    // Helper: Format Dates
    function formatDate(dateStr) {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", " + d.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    // Animated Number Counter
    function animateCounter(el, start, end, duration = 800, isCurrency = false, isPercent = false) {
        if (!el) return;
        const startTime = performance.now();
        const startVal = parseFloat(start) || 0;
        const endVal = parseFloat(end) || 0;

        el.classList.add("counter-updating");

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutProgress = 1 - Math.pow(1 - progress, 3);
            const current = startVal + (endVal - startVal) * easeOutProgress;

            if (isCurrency) {
                el.textContent = formatINR(current);
            } else if (isPercent) {
                el.textContent = `${current.toFixed(1)}%`;
            } else {
                el.textContent = Math.round(current).toString();
            }

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                setTimeout(() => el.classList.remove("counter-updating"), 200);
            }
        }
        requestAnimationFrame(update);
    }

    // Native HTML5 Canvas Confetti Celebration FX
    function triggerConfetti() {
        const canvas = elements.confettiCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ["#10b981", "#34d399", "#6366f1", "#8b5cf6", "#f59e0b", "#38bdf8"];

        for (let i = 0; i < 90; i++) {
            particles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 300,
                y: canvas.height * 0.4 + (Math.random() - 0.5) * 100,
                radius: Math.random() * 6 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 1.2) * 16,
                gravity: 0.35,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                opacity: 1,
            });
        }

        let animationFrame;
        function renderParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let active = false;

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.rotation += p.rotSpeed;
                p.opacity -= 0.012;

                if (p.opacity > 0) {
                    active = true;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.globalAlpha = Math.max(p.opacity, 0);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 1.5);
                    ctx.restore();
                }
            }

            if (active) {
                animationFrame = requestAnimationFrame(renderParticles);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                cancelAnimationFrame(animationFrame);
            }
        }
        renderParticles();
    }

    // Initialize Chart.js Visualizations
    function initCharts() {
        if (typeof Chart === "undefined") return;

        // Global Chart Defaults for Dark Theme
        Chart.defaults.color = "#94a3b8";
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.borderColor = "rgba(255, 255, 255, 0.06)";

        // 1. Revenue Velocity Area Line Chart
        const velocityCtx = document.getElementById("chart-revenue-velocity")?.getContext("2d");
        if (velocityCtx) {
            const gradRecovered = velocityCtx.createLinearGradient(0, 0, 0, 240);
            gradRecovered.addColorStop(0, "rgba(16, 185, 129, 0.45)");
            gradRecovered.addColorStop(1, "rgba(16, 185, 129, 0.0)");

            const gradIntercepted = velocityCtx.createLinearGradient(0, 0, 0, 240);
            gradIntercepted.addColorStop(0, "rgba(99, 102, 241, 0.3)");
            gradIntercepted.addColorStop(1, "rgba(99, 102, 241, 0.0)");

            state.charts.velocity = new Chart(velocityCtx, {
                type: "line",
                data: {
                    labels: ["12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "Now"],
                    datasets: [
                        {
                            label: "Recovered Revenue (₹)",
                            data: [0, 2499, 2499, 5949, 5949, 5949, 5949],
                            borderColor: "#10b981",
                            backgroundColor: gradRecovered,
                            borderWidth: 2.5,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: "#10b981",
                            pointRadius: 4,
                            pointHoverRadius: 6,
                        },
                        {
                            label: "Intercepted Failures (₹)",
                            data: [1200, 3699, 7149, 11450, 18200, 26900, 31400],
                            borderColor: "#6366f1",
                            backgroundColor: gradIntercepted,
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: "#6366f1",
                            pointRadius: 3,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: "rgba(15, 23, 42, 0.95)",
                            borderColor: "rgba(255, 255, 255, 0.15)",
                            borderWidth: 1,
                            padding: 10,
                            callbacks: {
                                label: (c) => `${c.dataset.label}: ${formatINR(c.raw)}`,
                            },
                        },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { callback: (v) => formatINR(v) },
                        },
                        x: { grid: { display: false } },
                    },
                },
            });
        }

        // 2. Outcome Breakdown Donut Chart
        const donutCtx = document.getElementById("chart-outcome-donut")?.getContext("2d");
        if (donutCtx) {
            state.charts.donut = new Chart(donutCtx, {
                type: "doughnut",
                data: {
                    labels: ["Recovered (Paid)", "Active Links Sent", "Hard Declines / Fraud", "Max Retries"],
                    datasets: [
                        {
                            data: [2, 1, 1, 1],
                            backgroundColor: ["#10b981", "#f59e0b", "#f43f5e", "#64748b"],
                            borderWidth: 0,
                            hoverOffset: 6,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "70%",
                    plugins: {
                        legend: {
                            position: "right",
                            labels: { boxWidth: 12, padding: 12, font: { size: 11.5 } },
                        },
                        tooltip: {
                            backgroundColor: "rgba(15, 23, 42, 0.95)",
                            borderColor: "rgba(255, 255, 255, 0.15)",
                            borderWidth: 1,
                        },
                    },
                },
            });
        }

        // 3. Decline Reason Bar Chart
        const declineCtx = document.getElementById("chart-decline-bars")?.getContext("2d");
        if (declineCtx) {
            state.charts.decline = new Chart(declineCtx, {
                type: "bar",
                data: {
                    labels: ["TIMEOUT", "LOW BALANCE", "GATEWAY", "FRAUD", "EXPIRED CARD"],
                    datasets: [
                        {
                            label: "Total Amount at Risk (₹)",
                            data: [3749, 8900, 15450, 14500, 3200],
                            backgroundColor: ["#10b981", "#6366f1", "#f59e0b", "#f43f5e", "#ec4899"],
                            borderRadius: 6,
                        },
                    ],
                },
                options: {
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: { label: (c) => `Value: ${formatINR(c.raw)}` },
                        },
                    },
                    scales: {
                        x: { ticks: { callback: (v) => formatINR(v) } },
                        y: { grid: { display: false } },
                    },
                },
            });
        }

        // 4. Channel Conversion Rate Bar Chart
        const channelCtx = document.getElementById("chart-channel-conversion")?.getContext("2d");
        if (channelCtx) {
            state.charts.channel = new Chart(channelCtx, {
                type: "bar",
                data: {
                    labels: ["WhatsApp (AI)", "SMS (Link)", "HTML Email", "In-App Push"],
                    datasets: [
                        {
                            label: "Conversion Rate (%)",
                            data: [78.4, 45.2, 34.8, 26.5],
                            backgroundColor: [
                                "rgba(16, 185, 129, 0.85)",
                                "rgba(99, 102, 241, 0.85)",
                                "rgba(139, 92, 246, 0.85)",
                                "rgba(245, 158, 11, 0.85)",
                            ],
                            borderRadius: 6,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: { label: (c) => `Conversion: ${c.raw}%` },
                        },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { callback: (v) => `${v}%` },
                        },
                        x: { grid: { display: false } },
                    },
                },
            });
        }
    }

    // Dynamic Chart Update Function
    function updateCharts(a) {
        if (!a) return;

        // Update Donut Chart
        if (state.charts.donut) {
            state.charts.donut.data.datasets[0].data = [
                a.recoveredCount || 0,
                a.recoverySentCount || 0,
                a.escalatedCount || 0,
                (a.totalTransactions || 0) - (a.recoveredCount + a.recoverySentCount + a.escalatedCount) > 0 
                    ? (a.totalTransactions - (a.recoveredCount + a.recoverySentCount + a.escalatedCount)) 
                    : 0,
            ];
            state.charts.donut.update();
        }

        // Update Velocity Line Chart
        if (state.charts.velocity) {
            const currentRecovered = state.charts.velocity.data.datasets[0].data;
            const currentIntercepted = state.charts.velocity.data.datasets[1].data;

            currentRecovered[currentRecovered.length - 1] = a.totalRecoveredRevenue || 0;
            currentIntercepted[currentIntercepted.length - 1] = a.totalFailedRevenue || 0;

            state.charts.velocity.update();
        }

        // Update Decline Reasons Horizontal Bar Chart
        if (state.charts.decline && a.failureCodeBreakdown && a.failureCodeBreakdown.length > 0) {
            state.charts.decline.data.labels = a.failureCodeBreakdown.map((f) => 
                f.failure_code.replace("BAD_REQUEST_", "").replace("_OR_FRAUD", "").substring(0, 15)
            );
            state.charts.decline.data.datasets[0].data = a.failureCodeBreakdown.map((f) => f.total_amount);
            state.charts.decline.update();
        }
    }

    // Mobile Menu Toggle
    if (elements.mobileMenuToggle && elements.sidebar) {
        elements.mobileMenuToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            elements.sidebar.classList.toggle("mobile-open");
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener("click", (e) => {
            if (elements.sidebar.classList.contains("mobile-open") &&
                !elements.sidebar.contains(e.target) &&
                e.target !== elements.mobileMenuToggle) {
                elements.sidebar.classList.remove("mobile-open");
            }
        });
    }

    // Tab Navigation
    elements.navItems.forEach((btn) => {
        btn.addEventListener("click", () => {
            const tabId = btn.dataset.tab;
            switchTab(tabId);
            // Close mobile menu on tab switch
            if (elements.sidebar) {
                elements.sidebar.classList.remove("mobile-open");
            }
        });
    });

    function switchTab(tabId) {
        elements.navItems.forEach((b) => b.classList.toggle("active", b.dataset.tab === tabId));
        elements.tabPanes.forEach((pane) => pane.classList.toggle("active", pane.id === tabId));
        state.activeTab = tabId;

        const titles = {
            "tab-dashboard": { title: "Executive Revenue Recovery Dashboard", sub: "Autonomous AI pipeline intercepting payment failures and restoring merchant revenue." },
            "tab-workbench": { title: "⚡ Interactive Simulation Workbench", sub: "Trigger simulated webhook payloads to watch the agent execute live across graph nodes." },
            "tab-studio": { title: "💬 Multi-Channel AI Outreach Studio", sub: "Preview tailored recovery outreach generated across WhatsApp, SMS, Email, and Push." },
            "tab-ledger": { title: "📑 Persistent Transaction Recovery Ledger", sub: "Searchable database tracking every intercepted transaction and generated link." },
            "tab-guardrails": { title: "🛡️ Financial Guardrails & Merchant Policy Matrix", sub: "Configure strict rule-based guardrails enforced before generating recovery links." },
            "tab-demo-store": { title: "🛒 Interactive Demo E-Commerce Store", sub: "Simulate real customer purchases and watch RecovAI autonomously intercept and recover failed payments." },
        };

        if (titles[tabId]) {
            elements.pageTitle.textContent = titles[tabId].title;
            elements.pageSubtitle.textContent = titles[tabId].sub;
        }

        if (tabId === "tab-ledger") {
            fetchTransactions();
        }
    }

    elements.btnQuickSimulate.addEventListener("click", () => switchTab("tab-workbench"));
    elements.btnRefresh.addEventListener("click", () => {
        fetchAnalytics();
        fetchTransactions();
        showToast("Dashboard data refreshed");
    });

    // Sync Razorpay Button
    elements.btnSyncRzp?.addEventListener("click", async () => {
        try {
            elements.btnSyncRzp.style.opacity = "0.6";
            const res = await fetch("/api/v1/sync-razorpay");
            const data = await res.json();
            if (data.success) {
                renderAnalytics(data.analytics);
                fetchTransactions();
                showToast("Razorpay payment links synced successfully!");
            }
        } catch (e) {
            console.error("Sync error:", e);
        } finally {
            elements.btnSyncRzp.style.opacity = "1";
        }
    });

    // Preset Buttons in Simulation
    document.querySelectorAll(".btn-preset").forEach((btn) => {
        btn.addEventListener("click", () => {
            elements.simAmount.value = btn.dataset.amount;
        });
    });

    // Multi-Channel Studio Switcher
    elements.channelBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            elements.channelBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const ch = btn.dataset.channel;
            state.activeChannel = ch;

            elements.devicePanes.forEach((pane) => {
                pane.classList.toggle("active", pane.id === `preview-${ch}`);
            });
        });
    });

    // Guardrail slider live update
    elements.sliderMaxRetries.addEventListener("input", (e) => {
        elements.valMaxRetries.textContent = `${e.target.value} attempts`;
    });

    // Fetch Analytics Data
    async function fetchAnalytics() {
        try {
            const res = await fetch("/api/v1/analytics");
            const data = await res.json();
            if (!data.success) return;
            state.analytics = data.data;
            renderAnalytics(data.data);
            updateCharts(data.data);
        } catch (err) {
            console.error("Failed to fetch analytics:", err);
        }
    }

    function renderAnalytics(a) {
        // Smooth Number Counter Animations
        animateCounter(elements.kpiRecoveredInr, elements.kpiRecoveredInr.getAttribute("data-val") || 0, a.totalRecoveredRevenue, 600, true);
        elements.kpiRecoveredInr.setAttribute("data-val", a.totalRecoveredRevenue);
        elements.kpiRecoveredCount.textContent = `${a.recoveredCount} settled orders`;

        animateCounter(elements.kpiRecoveryRate, parseFloat(elements.kpiRecoveryRate.textContent) || 0, a.recoveryRate, 600, false, true);
        elements.kpiTotalTx.textContent = `Across ${a.totalTransactions} total failures`;

        animateCounter(elements.kpiPendingInr, elements.kpiPendingInr.getAttribute("data-val") || 0, a.totalPendingRecovery, 600, true);
        elements.kpiPendingInr.setAttribute("data-val", a.totalPendingRecovery);
        elements.kpiPendingCount.textContent = `${a.recoverySentCount} links active`;

        animateCounter(elements.kpiEscalatedInr, elements.kpiEscalatedInr.getAttribute("data-val") || 0, a.totalEscalated, 600, true);
        elements.kpiEscalatedInr.setAttribute("data-val", a.totalEscalated);
        elements.kpiEscalatedCount.textContent = `${a.escalatedCount} guardrail stops`;

        // Render failure reason bars
        if (elements.failureDistList) {
            elements.failureDistList.innerHTML = "";
            const maxCount = Math.max(...a.failureCodeBreakdown.map((f) => f.count), 1);

            a.failureCodeBreakdown.forEach((f) => {
                const percent = Math.round((f.count / maxCount) * 100);
                const isSoft = ["BAD_REQUEST_PAYMENT_TIMED_OUT", "GATEWAY_ERROR", "INSUFFICIENT_FUNDS", "NETWORK_ERROR"].includes(f.failure_code);

                const row = document.createElement("div");
                row.className = "fail-bar-row";
                row.innerHTML = `
                    <div class="fail-bar-meta">
                        <span style="font-family: var(--font-mono);">${f.failure_code}</span>
                        <span><strong>${f.count}</strong> (${formatINR(f.total_amount)})</span>
                    </div>
                    <div class="fail-bar-track">
                        <div class="fail-bar-fill ${isSoft ? "soft" : "hard"}" style="width: ${percent}%;"></div>
                    </div>
                `;
                elements.failureDistList.appendChild(row);
            });
        }

        // Render recent audit logs
        if (elements.liveAuditFeed && a.recentLogs) {
            elements.liveAuditFeed.innerHTML = "";
            a.recentLogs.forEach((log) => {
                const item = document.createElement("div");
                item.className = "log-item";
                item.innerHTML = `
                    <span class="log-tag ${log.node_name}">${log.node_name}</span>
                    <div class="log-content">
                        <div class="log-text">${log.message}</div>
                        <div class="log-time">${formatDate(log.created_at)} • Tx: ${log.transaction_id}</div>
                    </div>
                `;
                elements.liveAuditFeed.appendChild(item);
            });
        }
    }

    // Fetch Transactions Ledger
    async function fetchTransactions() {
        try {
            const search = elements.ledgerSearch.value.trim();
            const status = elements.ledgerStatusFilter.value;
            const query = new URLSearchParams({ search, status, limit: "50" });

            const res = await fetch(`/api/v1/transactions?${query}`);
            const data = await res.json();
            if (!data.success) return;
            state.transactions = data.data;
            renderTransactions(data.data);
        } catch (err) {
            console.error("Failed to fetch transactions:", err);
        }
    }

    function renderTransactions(list) {
        if (!elements.transactionsTbody) return;
        elements.transactionsTbody.innerHTML = "";

        if (list.length === 0) {
            elements.transactionsTbody.innerHTML = `<tr><td colspan="8" class="text-center py-4" style="color: var(--text-muted);">No transactions match your search criteria.</td></tr>`;
            return;
        }

        list.forEach((tx) => {
            const tr = document.createElement("tr");
            tr.id = `row-${tx.transaction_id}`;
            tr.innerHTML = `
                <td><strong style="font-family: var(--font-mono);">${tx.transaction_id}</strong></td>
                <td>
                    <div>${tx.customer_name || "Customer"}</div>
                    <small style="color: var(--text-muted);">${tx.customer_email}</small>
                </td>
                <td><strong>${formatINR(tx.amount_inr)}</strong></td>
                <td><span style="font-family: var(--font-mono); font-size: 11px;">${tx.failure_code}</span></td>
                <td><span class="badge badge-${tx.status}">${tx.status === "RECOVERED" ? "RECOVERED (PAID) ✅" : tx.status.replace(/_/g, " ")}</span></td>
                <td>${tx.retry_count} / 3</td>
                <td><small style="color: var(--text-muted);">${formatDate(tx.created_at)}</small></td>
                <td>
                    <button class="btn btn-xs btn-secondary btn-inspect-tx" data-id="${tx.transaction_id}">Inspect</button>
                    ${tx.status === "RECOVERY_SENT" ? `<button class="btn btn-xs btn-indigo btn-send-email-tx" data-id="${tx.transaction_id}" style="margin-left: 4px;">📧 Email</button>` : ""}
                    ${tx.status === "RECOVERY_SENT" ? `<button class="btn btn-xs btn-emerald btn-resolve-tx" data-id="${tx.transaction_id}" style="margin-left: 4px;">Mark Paid</button>` : ""}
                </td>
            `;
            elements.transactionsTbody.appendChild(tr);
        });

        // Attach event listeners to action buttons
        document.querySelectorAll(".btn-inspect-tx").forEach((btn) => {
            btn.addEventListener("click", () => openDrawer(btn.dataset.id));
        });

        document.querySelectorAll(".btn-resolve-tx").forEach((btn) => {
            btn.addEventListener("click", () => resolveTransaction(btn.dataset.id));
        });

        document.querySelectorAll(".btn-send-email-tx").forEach((btn) => {
            btn.addEventListener("click", () => sendEmailForTransaction(btn.dataset.id, btn));
        });
    }

    elements.ledgerSearch.addEventListener("input", debounce(fetchTransactions, 300));
    elements.ledgerStatusFilter.addEventListener("change", fetchTransactions);

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Side Drawer Inspection
    async function openDrawer(txId) {
        try {
            const res = await fetch(`/api/v1/transactions/${txId}`);
            const data = await res.json();
            if (!data.success) return;
            const tx = data.data;
            state.activeTxDrawer = tx;

            elements.drawerTxTitle.textContent = `${tx.transaction_id}`;
            elements.drawerStatusBadge.className = `badge badge-${tx.status}`;
            elements.drawerStatusBadge.textContent = tx.status === "RECOVERED" ? "RECOVERED (PAID) ✅" : tx.status.replace(/_/g, " ");

            elements.drawerMetaGrid.innerHTML = `
                <div class="meta-item"><label>Customer Name</label><strong>${tx.customer_name || "Valued Customer"}</strong></div>
                <div class="meta-item"><label>Customer Email</label><strong>${tx.customer_email}</strong></div>
                <div class="meta-item"><label>Amount</label><strong>${formatINR(tx.amount_inr)}</strong></div>
                <div class="meta-item"><label>Failure Code</label><strong style="font-family: var(--font-mono); font-size: 11px;">${tx.failure_code}</strong></div>
                <div class="meta-item"><label>Created At</label><strong>${formatDate(tx.created_at)}</strong></div>
                <div class="meta-item"><label>Settled At</label><strong>${tx.recovered_at ? formatDate(tx.recovered_at) : "Pending"}</strong></div>
            `;

            if (tx.recovery_link) {
                elements.drawerLinkSection.style.display = "block";
                elements.drawerRecoveryLink.href = tx.recovery_link;
                elements.drawerRecoveryLink.textContent = tx.recovery_link;
            } else {
                elements.drawerLinkSection.style.display = "none";
            }

            // Multi-channel copy in drawer
            if (tx.channel_messages) {
                elements.drawerChannelCopy.innerHTML = `
                    <div style="margin-bottom: 8px;"><strong>WhatsApp:</strong> <p>${tx.channel_messages.whatsapp || "-"}</p></div>
                    <div style="margin-bottom: 8px;"><strong>SMS:</strong> <p>${tx.channel_messages.sms || "-"}</p></div>
                    <div><strong>Email Subject:</strong> <p>${tx.channel_messages.email_subject || "-"}</p></div>
                `;
            } else {
                elements.drawerChannelCopy.innerHTML = `<p style="color: var(--text-muted);">(No outreach copy generated for this status)</p>`;
            }

            // Audit Trail list
            elements.drawerAuditList.innerHTML = "";
            (tx.auditLogs || []).forEach((log) => {
                const item = document.createElement("div");
                item.className = "drawer-audit-item";
                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                        <strong style="color: var(--accent-indigo); font-family: var(--font-mono);">${log.node_name}</strong>
                        <span style="color: var(--text-muted); font-size: 10px;">${formatDate(log.created_at)}</span>
                    </div>
                    <div>${log.message}</div>
                `;
                elements.drawerAuditList.appendChild(item);
            });

            // Show/hide action buttons in footer based on status
            elements.btnDrawerResolve.style.display = tx.status === "RECOVERY_SENT" ? "block" : "none";
            elements.btnDrawerSendEmail.style.display = (tx.status === "RECOVERY_SENT" && tx.recovery_link) ? "block" : "none";

            // Open drawer
            elements.drawerOverlay.classList.add("active");
            elements.sideDrawer.classList.add("active");
        } catch (err) {
            console.error("Failed to inspect transaction:", err);
        }
    }

    function closeDrawer() {
        elements.drawerOverlay.classList.remove("active");
        elements.sideDrawer.classList.remove("active");
        state.activeTxDrawer = null;
    }

    elements.btnCloseDrawer.addEventListener("click", closeDrawer);
    elements.drawerOverlay.addEventListener("click", closeDrawer);

    // Resolve Transaction
    async function resolveTransaction(txId) {
        try {
            const res = await fetch(`/api/v1/transactions/${txId}/resolve`, { method: "POST" });
            const data = await res.json();
            if (data.success) {
                triggerConfetti();
                showToast(`Payment Confirmed! Transaction ${txId} is RECOVERED! 💰🎉`, "success");
                fetchAnalytics();
                fetchTransactions();

                if (state.lastSimulatedTx && (state.lastSimulatedTx.transactionId === txId || state.lastSimulatedTx.transaction_id === txId)) {
                    elements.simResBadge.className = "badge badge-RECOVERED";
                    elements.simResBadge.textContent = "RECOVERED (PAID) ✅";
                    if (elements.btnSimResolve) elements.btnSimResolve.style.display = "none";
                }

                if (state.activeTxDrawer && state.activeTxDrawer.transaction_id === txId) {
                    openDrawer(txId);
                }
            }
        } catch (err) {
            console.error("Failed to resolve transaction:", err);
        }
    }

    elements.btnDrawerResolve.addEventListener("click", () => {
        if (state.activeTxDrawer) {
            resolveTransaction(state.activeTxDrawer.transaction_id);
        }
    });

    elements.btnDrawerSendEmail.addEventListener("click", () => {
        if (state.activeTxDrawer) {
            sendEmailForTransaction(state.activeTxDrawer.transaction_id, elements.btnDrawerSendEmail);
        }
    });

    elements.btnSimResolve?.addEventListener("click", () => {
        if (state.lastSimulatedTx) {
            const txId = state.lastSimulatedTx.transactionId || state.lastSimulatedTx.transaction_id;
            resolveTransaction(txId);
        }
    });

    // Copy links
    elements.btnCopySimLink?.addEventListener("click", () => {
        const link = elements.simResLink.textContent;
        navigator.clipboard.writeText(link);
        showToast("Recovery link copied to clipboard");
    });

    elements.btnCopyDrawerLink?.addEventListener("click", () => {
        const link = elements.drawerRecoveryLink.textContent;
        navigator.clipboard.writeText(link);
        showToast("Recovery link copied to clipboard");
    });

    // Send Recovery Email for a Transaction
    async function sendEmailForTransaction(txId, btnEl) {
        if (!txId) return;

        const originalText = btnEl ? btnEl.innerHTML : "";
        if (btnEl) {
            btnEl.innerHTML = `<span class="spinner"></span> Sending...`;
            btnEl.disabled = true;
        }

        try {
            const res = await fetch(`/api/v1/transactions/${txId}/send-email`, { method: "POST" });
            const data = await res.json();

            if (data.success) {
                showToast(`📧 Recovery email sent to ${data.recipient}!`, "success");
                // Refresh audit trail in drawer if open
                if (state.activeTxDrawer && state.activeTxDrawer.transaction_id === txId) {
                    openDrawer(txId);
                }
            } else {
                showToast(`Email failed: ${data.error}`, "error");
            }
        } catch (err) {
            console.error("Send email error:", err);
            showToast("Failed to send recovery email", "error");
        } finally {
            if (btnEl) {
                btnEl.innerHTML = originalText;
                btnEl.disabled = false;
            }
        }
    }

    // Visual Graph Animation Helper
    function resetGraphVisuals() {
        document.querySelectorAll(".graph-node").forEach((n) => n.classList.remove("active-pulse", "active-halt"));
        document.querySelectorAll(".graph-connector").forEach((c) => c.classList.remove("active"));
        elements.graphStatusBadge.textContent = "Idle";
        elements.graphStatusBadge.className = "badge badge-indigo";
    }

    async function animateGraph(status, isSoft) {
        resetGraphVisuals();
        elements.graphStatusBadge.textContent = "Executing...";

        // Step 1: Start
        document.getElementById("node-start")?.classList.add("active-pulse");
        await sleep(350);
        document.getElementById("conn-1")?.classList.add("active");

        // Step 2: Classify
        document.getElementById("node-classify")?.classList.add("active-pulse");
        await sleep(400);
        document.getElementById("conn-2")?.classList.add("active");

        // Step 3: Guardrail
        document.getElementById("node-guardrail")?.classList.add("active-pulse");
        await sleep(400);

        if (status === "RECOVERY_SENT") {
            document.querySelector("#branch-proceed .graph-connector")?.classList.add("active");
            document.getElementById("node-create-link")?.classList.add("active-pulse");
            await sleep(450);
            document.getElementById("conn-3")?.classList.add("active");

            document.getElementById("node-outreach")?.classList.add("active-pulse");
            await sleep(450);
            document.getElementById("conn-4")?.classList.add("active");

            document.getElementById("node-end-success")?.classList.add("active-pulse");
            elements.graphStatusBadge.textContent = "Recovery Dispatched";
            elements.graphStatusBadge.className = "badge badge-emerald";
        } else {
            document.querySelector("#branch-escalate .graph-connector")?.classList.add("active");
            document.getElementById("node-end-halt")?.classList.add("active-halt");
            elements.graphStatusBadge.textContent = "Halted by Guardrail";
            elements.graphStatusBadge.className = "badge badge-rose";
        }
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Simulation Form Submit
    elements.simForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            transactionId: `pay_sim_${Date.now().toString().slice(-6)}`,
            customerName: elements.simName.value.trim(),
            customerEmail: elements.simEmail.value.trim(),
            amountInr: parseFloat(elements.simAmount.value),
            retryCount: parseInt(elements.simRetryCount.value, 10),
            failureCode: elements.simFailureCode.value,
        };

        // Show spinner
        elements.simSpinner.style.display = "inline-block";
        elements.simBtnText.textContent = "Executing LangGraph Pipeline...";
        elements.simResultBox.style.display = "none";

        try {
            const res = await fetch("/api/v1/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data.success) {
                const result = data.data;
                const tx = data.transaction;
                state.lastSimulatedTx = tx || result;

                // Animate graph
                await animateGraph(result.status, result.status === "RECOVERY_SENT");

                // Show result box
                elements.simResultBox.style.display = "block";
                elements.simResStatusTitle.textContent = `Pipeline Result: ${result.status.replace(/_/g, " ")}`;
                elements.simResBadge.className = `badge badge-${result.status}`;
                elements.simResBadge.textContent = result.status;

                if (result.recoveryLink) {
                    elements.resLinkRow.style.display = "block";
                    elements.simResLink.href = result.recoveryLink;
                    elements.simResLink.textContent = result.recoveryLink;
                    elements.simResMsg.textContent = result.outreachMessage;

                    if (elements.btnSimOpenLink) {
                        elements.btnSimOpenLink.href = result.recoveryLink;
                        elements.btnSimOpenLink.style.display = "inline-flex";
                    }
                    if (elements.btnSimResolve) {
                        elements.btnSimResolve.style.display = "inline-flex";
                    }

                    // Update studio live previews with this simulated transaction
                    updateStudioPreviews(tx || result);
                } else {
                    elements.resLinkRow.style.display = "none";
                    elements.simResMsg.textContent = "(No outreach generated - Transaction blocked by guardrail)";
                    if (elements.btnSimOpenLink) elements.btnSimOpenLink.style.display = "none";
                    if (elements.btnSimResolve) elements.btnSimResolve.style.display = "none";
                }

                showToast(`Simulation completed: ${result.status}`, result.status === "RECOVERY_SENT" ? "success" : "error");
                fetchAnalytics();
                fetchTransactions();
            }
        } catch (err) {
            console.error("Simulation failed:", err);
            showToast("Simulation execution failed", "error");
        } finally {
            elements.simSpinner.style.display = "none";
            elements.simBtnText.textContent = "🚀 Execute RecovAI Agent Pipeline";
        }
    });

    // Update Studio Device Previews
    function updateStudioPreviews(data) {
        const msgs = data.channelMessages || data.channel_messages;
        const link = data.recoveryLink || data.recovery_link || "https://rzp.io/rzp/example";
        const amount = formatINR(data.amountInr || data.amount_inr || 1499);
        const name = data.customerName || data.customer_name || "Valued Customer";

        if (msgs) {
            if (elements.waPreviewText) elements.waPreviewText.textContent = msgs.whatsapp || `Hi ${name}, your payment was interrupted. Complete here: ${link}`;
            if (elements.waPreviewLink) {
                elements.waPreviewLink.href = link;
                elements.waPreviewLink.textContent = `💳 Complete Payment (${amount})`;
            }

            if (elements.smsPreviewText) elements.smsPreviewText.textContent = msgs.sms || `RecovAI: Payment failed. Complete now: ${link}`;
            if (elements.emailPreviewSubject) elements.emailPreviewSubject.textContent = msgs.email_subject || `Action Required: Complete your order`;
            if (elements.emailPreviewBody) {
                elements.emailPreviewBody.innerHTML = `
                    <p>Dear ${name},</p>
                    <p>${msgs.email_body || "We noticed an issue processing your transaction. Please use the secure link below to finish your payment:"}</p>
                    <div class="email-cta-box">
                        <a href="${link}" target="_blank" class="btn btn-primary">Complete Payment Securely (${amount})</a>
                    </div>
                    <p class="email-footer-text">This link is securely powered by Razorpay and expires in 24 hours.</p>
                `;
            }
            if (elements.pushPreviewText) elements.pushPreviewText.textContent = msgs.push_notification || `Tap here to finish your pending order of ${amount}.`;
        }
    }

    // Guardrail Settings Management
    async function loadGuardrails() {
        try {
            const res = await fetch("/api/v1/guardrails");
            const data = await res.json();
            if (!data.success) return;
            state.guardrails = data.data;

            if (data.data.max_retry_count) {
                elements.sliderMaxRetries.value = data.data.max_retry_count;
                elements.valMaxRetries.textContent = `${data.data.max_retry_count} attempts`;
            }
            if (data.data.high_value_threshold) {
                elements.inputVipThreshold.value = data.data.high_value_threshold;
            }
        } catch (err) {
            console.error("Failed to load guardrails:", err);
        }
    }

    elements.btnSaveGuardrails.addEventListener("click", async () => {
        try {
            const payload = {
                max_retry_count: elements.sliderMaxRetries.value,
                high_value_threshold: elements.inputVipThreshold.value,
            };

            const res = await fetch("/api/v1/guardrails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                showToast("Financial guardrails saved successfully!", "success");
            }
        } catch (err) {
            console.error("Failed to save guardrails:", err);
            showToast("Failed to save guardrails", "error");
        }
    });

    // Server-Sent Events (SSE) Real-Time Subscription
    function initSSE() {
        try {
            const eventSource = new EventSource("/api/v1/events");

            eventSource.addEventListener("recovery_executed", (e) => {
                const data = JSON.parse(e.data);
                if (data.analytics) {
                    renderAnalytics(data.analytics);
                    updateCharts(data.analytics);
                }
                fetchTransactions();
                showToast(`New recovery pipeline executed for ${data.transaction?.transaction_id || "payment"}`);
            });

            eventSource.addEventListener("transaction_resolved", (e) => {
                const data = JSON.parse(e.data);
                triggerConfetti();

                if (data.analytics) {
                    renderAnalytics(data.analytics);
                    updateCharts(data.analytics);
                }
                fetchTransactions();

                const txId = data.transaction?.transaction_id;
                showToast(`🎉 Payment Recovered! ${formatINR(data.transaction?.amount_inr)} captured for ${txId}`, "success");

                // Highlight table row if visible
                const row = document.getElementById(`row-${txId}`);
                if (row) {
                    row.style.transition = "background-color 0.5s";
                    row.style.backgroundColor = "rgba(16, 185, 129, 0.25)";
                    setTimeout(() => { row.style.backgroundColor = ""; }, 2500);
                }

                // If currently viewed in simulation or drawer, update badge
                if (state.lastSimulatedTx && (state.lastSimulatedTx.transactionId === txId || state.lastSimulatedTx.transaction_id === txId)) {
                    elements.simResBadge.className = "badge badge-RECOVERED";
                    elements.simResBadge.textContent = "RECOVERED (PAID) ✅";
                    if (elements.btnSimResolve) elements.btnSimResolve.style.display = "none";
                }

                if (state.activeTxDrawer && state.activeTxDrawer.transaction_id === txId) {
                    openDrawer(txId);
                }
            });

            eventSource.onerror = () => {
                console.warn("SSE connection interrupted, will retry automatically...");
            };
        } catch (e) {
            console.error("Failed to initialize SSE:", e);
        }
    }

    // ─── DEMO STORE FUNCTIONALITY ──────────────────────────
    function initDemoStore() {
        const gridEl = document.getElementById("demo-products-grid");
        const countEl = document.getElementById("demo-product-count");
        const cartEmptyEl = document.getElementById("demo-cart-empty");
        const cartItemsEl = document.getElementById("demo-cart-items");
        const cartFooterEl = document.getElementById("demo-cart-footer");
        const cartBadgeEl = document.getElementById("demo-cart-badge");
        const cartTotalEl = document.getElementById("demo-cart-total");
        const checkoutBtn = document.getElementById("demo-checkout-btn");
        const overlayEl = document.getElementById("demo-recovery-overlay");

        let currentOrder = null;

        // Fetch products from backend
        async function fetchProducts() {
            try {
                const res = await fetch("/api/v1/demo/products");
                const data = await res.json();
                if (data.success) {
                    state.demoProducts = data.data;
                    renderProducts();
                }
            } catch (err) {
                console.error("Failed to fetch demo products:", err);
            }
        }

        // Render product grid
        function renderProducts() {
            if (!gridEl) return;
            if (countEl) countEl.textContent = `${state.demoProducts.length} products`;

            gridEl.innerHTML = state.demoProducts.map((p) => `
                <div class="demo-product-card">
                    <div class="demo-prod-top">
                        <div class="demo-prod-emoji">${p.emoji}</div>
                        ${p.badge ? `<span class="demo-prod-badge">${p.badge}</span>` : ""}
                    </div>
                    <h4 class="demo-prod-name">${p.name}</h4>
                    <p class="demo-prod-desc">${p.description}</p>
                    <div class="demo-prod-meta">
                        <span class="demo-prod-price">${formatINR(p.price)}</span>
                        <button class="demo-add-cart-btn" data-id="${p.id}">
                            + Add to Cart
                        </button>
                    </div>
                </div>
            `).join("");

            // Add click listeners
            gridEl.querySelectorAll(".demo-add-cart-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    addToCart(btn.dataset.id);
                });
            });
        }

        // Add to cart logic
        function addToCart(productId) {
            const existing = state.demoCart.find((ci) => ci.productId === productId);
            if (existing) {
                existing.quantity += 1;
            } else {
                state.demoCart.push({ productId, quantity: 1 });
            }
            renderCart();
            showToast("Item added to cart");
        }

        // Render cart
        function renderCart() {
            const totalItems = state.demoCart.reduce((sum, item) => sum + item.quantity, 0);
            if (cartBadgeEl) cartBadgeEl.textContent = totalItems.toString();

            if (state.demoCart.length === 0) {
                if (cartEmptyEl) cartEmptyEl.style.display = "block";
                if (cartItemsEl) cartItemsEl.style.display = "none";
                if (cartFooterEl) cartFooterEl.style.display = "none";
                return;
            }

            if (cartEmptyEl) cartEmptyEl.style.display = "none";
            if (cartItemsEl) cartItemsEl.style.display = "flex";
            if (cartFooterEl) cartFooterEl.style.display = "block";

            let totalPrice = 0;
            const itemsHtml = state.demoCart.map((item) => {
                const product = state.demoProducts.find((p) => p.id === item.productId);
                if (!product) return "";
                const subtotal = product.price * item.quantity;
                totalPrice += subtotal;

                return `
                    <div class="demo-cart-item">
                        <div class="demo-cart-item-info">
                            <span class="demo-cart-item-emoji">${product.emoji}</span>
                            <div>
                                <div class="demo-cart-item-title">${product.name}</div>
                                <div class="demo-cart-item-price">${formatINR(product.price)}</div>
                            </div>
                        </div>
                        <div class="demo-cart-item-controls">
                            <button class="demo-qty-btn demo-qty-minus" data-id="${product.id}">-</button>
                            <span class="demo-qty-val">${item.quantity}</span>
                            <button class="demo-qty-btn demo-qty-plus" data-id="${product.id}">+</button>
                        </div>
                    </div>
                `;
            }).join("");

            if (cartItemsEl) cartItemsEl.innerHTML = itemsHtml;
            if (cartTotalEl) cartTotalEl.textContent = formatINR(totalPrice);

            // Add qty button handlers
            cartItemsEl.querySelectorAll(".demo-qty-minus").forEach((btn) => {
                btn.addEventListener("click", () => updateQty(btn.dataset.id, -1));
            });
            cartItemsEl.querySelectorAll(".demo-qty-plus").forEach((btn) => {
                btn.addEventListener("click", () => updateQty(btn.dataset.id, 1));
            });
        }

        function updateQty(productId, change) {
            const item = state.demoCart.find((ci) => ci.productId === productId);
            if (!item) return;
            item.quantity += change;
            if (item.quantity <= 0) {
                state.demoCart = state.demoCart.filter((ci) => ci.productId !== productId);
            }
            renderCart();
        }

        // Show Stage
        function showStage(stageId) {
            const stages = ["processing", "failure", "activating", "recovery", "recovered"];
            stages.forEach((s) => {
                const el = document.getElementById(`demo-stage-${s}`);
                if (el) el.style.display = s === stageId ? "block" : "none";
            });
        }

        // Handle Checkout Flow
        if (checkoutBtn) {
            checkoutBtn.addEventListener("click", async () => {
                if (state.demoCart.length === 0) {
                    showToast("Your cart is empty!", "error");
                    return;
                }

                const custName = document.getElementById("demo-cust-name")?.value || "Priya Patel";
                const custEmail = document.getElementById("demo-cust-email")?.value || "priya.patel@example.com";
                const failureCode = document.getElementById("demo-failure-code")?.value || "BAD_REQUEST_PAYMENT_TIMED_OUT";

                // Open overlay and show Stage 1: Processing
                overlayEl.style.display = "flex";
                showStage("processing");

                // Simulate payment processing delay (1.2s)
                await new Promise((r) => setTimeout(r, 1200));

                // Stage 2: Payment Failed
                showStage("failure");
                const totalAmount = state.demoCart.reduce((sum, item) => {
                    const p = state.demoProducts.find((prod) => prod.id === item.productId);
                    return sum + (p ? p.price * item.quantity : 0);
                }, 0);

                document.getElementById("demo-failure-reason").textContent = failureCode;
                document.getElementById("demo-failure-amount").textContent = formatINR(totalAmount);

                // Wait 1.5s then trigger RecovAI Agent
                await new Promise((r) => setTimeout(r, 1500));
                showStage("activating");

                // Animate agent steps sequentially
                const stepIds = ["classify", "guardrail", "link", "ai", "email"];
                stepIds.forEach((s) => {
                    const el = document.getElementById(`demo-astep-${s}`);
                    if (el) {
                        el.className = "demo-agent-step";
                        el.querySelector(".demo-step-spinner").style.display = "inline-block";
                    }
                });

                // Call backend checkout endpoint
                try {
                    const res = await fetch("/api/v1/demo/checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            items: state.demoCart,
                            customerName: custName,
                            customerEmail: custEmail,
                            failureCode,
                        }),
                    });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error);

                    currentOrder = data;

                    // Step animations
                    for (let i = 0; i < stepIds.length; i++) {
                        const s = stepIds[i];
                        const el = document.getElementById(`demo-astep-${s}`);
                        if (el) {
                            el.className = "demo-agent-step active";
                        }
                        await new Promise((r) => setTimeout(r, 400));
                        if (el) {
                            el.className = "demo-agent-step done";
                            const spinner = el.querySelector(".demo-step-spinner");
                            if (spinner) spinner.style.display = "none";
                        }
                    }

                    await new Promise((r) => setTimeout(r, 600));

                    // Stage 4: Recovery Ready
                    showStage("recovery");

                    const linkEl = document.getElementById("demo-recovery-link");
                    if (linkEl) {
                        linkEl.textContent = data.recovery?.recoveryLink || "https://rzp.io/rzp/demo";
                        linkEl.href = data.recovery?.recoveryLink || "#";
                    }

                    const msgs = data.recovery?.channelMessages || {};
                    const waText = document.getElementById("demo-ch-wa-text");
                    const smsText = document.getElementById("demo-ch-sms-text");
                    const pushText = document.getElementById("demo-ch-push-text");

                    if (waText) waText.textContent = msgs.whatsapp || `Hi ${custName}, complete your ₹${totalAmount} payment here: ${data.recovery?.recoveryLink}`;
                    if (smsText) smsText.textContent = msgs.sms || `RecovAI: Complete your ₹${totalAmount} order: ${data.recovery?.recoveryLink}`;
                    if (pushText) pushText.textContent = msgs.push_notification || `Tap to finish your pending order of ₹${totalAmount}.`;

                    // Refresh dashboard analytics in background
                    fetchAnalytics();
                    fetchTransactions();

                } catch (err) {
                    console.error("Demo checkout error:", err);
                    showToast("Error executing recovery pipeline: " + err.message, "error");
                    overlayEl.style.display = "none";
                }
            });
        }

        // Action: Complete Payment via Recovery Link
        const payRecoveryBtn = document.getElementById("demo-btn-pay-recovery");
        if (payRecoveryBtn) {
            payRecoveryBtn.addEventListener("click", async () => {
                if (!currentOrder) return;
                const txId = currentOrder.order?.transactionId;

                try {
                    payRecoveryBtn.disabled = true;
                    payRecoveryBtn.textContent = "Processing Settlement...";

                    const res = await fetch(`/api/v1/transactions/${txId}/resolve`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ paymentId: `pay_demo_recovered_${Date.now()}` }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        triggerConfetti();

                        // Stage 5: Recovered
                        showStage("recovered");
                        document.getElementById("demo-recovered-amount").textContent = `${formatINR(currentOrder.order?.totalAmount)} successfully recovered for merchant`;
                        document.getElementById("demo-recovered-txid").textContent = txId;

                        // Clear cart
                        state.demoCart = [];
                        renderCart();

                        fetchAnalytics();
                        fetchTransactions();
                    }
                } catch (e) {
                    console.error("Resolution error:", e);
                } finally {
                    payRecoveryBtn.disabled = false;
                    payRecoveryBtn.textContent = "✅ Complete Payment via Recovery Link";
                }
            });
        }

        // Action: Close overlay
        document.getElementById("demo-btn-close-recovery")?.addEventListener("click", () => {
            overlayEl.style.display = "none";
            state.demoCart = [];
            renderCart();
            switchTab("tab-ledger");
        });

        // Action: Restart Demo
        document.getElementById("demo-btn-restart")?.addEventListener("click", () => {
            overlayEl.style.display = "none";
            currentOrder = null;
        });

        fetchProducts();
    }

    // Initial Load
    initCharts();
    fetchAnalytics();
    fetchTransactions();
    loadGuardrails();
    initSSE();
    initDemoStore();

    // Dismiss Razorpay Splash Loader Screen after 1.6s
    setTimeout(() => {
        const splash = document.getElementById("rzp-splash-screen");
        if (splash) {
            splash.classList.add("fade-out");
            setTimeout(() => splash.remove(), 600);
        }
    }, 1600);
});

