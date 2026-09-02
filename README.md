# ⚡ RecovAI — Autonomous Agentic Revenue Recovery Pipeline

**RecovAI** is an autonomous revenue recovery engine built with **LangGraph.js**, **Groq AI (Llama 3 / GPT-120B)**, and **Razorpay**. It intercepts payment failures in real-time via webhooks, classifies decline reasons, enforces financial guardrails, generates instant recovery payment links, and crafts personalized multi-channel customer outreach copy across WhatsApp, SMS, Email, and Push notifications.

---

## ✨ Features

- 🛒 **Interactive Demo E-Commerce Store**: Includes a built-in mock storefront to simulate real customer purchases, trigger payment failures, and demonstrate the recovery agent live.
- 🧠 **LangGraph Agent Workflow**: State-machine driven recovery execution path (Classify → Guardrails → Razorpay Link → AI Outreach → Nodemailer Dispatch).
- 💬 **Multi-Channel AI Outreach Studio**: Live preview of Groq-generated personalized copy for WhatsApp Business, Transactional SMS, HTML Email, and In-App Push alerts.
- 🛡️ **Financial Guardrail Matrix**: Dynamic policy engine enforcing max retry thresholds and hard decline fraud blocks.
- 📊 **Executive Real-Time Dashboard**: Interactive analytics, revenue velocity charts, decline reason breakdown, and live Server-Sent Events (SSE) audit trail.
- ⚡ **Razorpay Webhooks & Sync**: Automatic background synchronization polling Razorpay to confirm payment link resolution.

---

## 📁 Project Structure

```
RecovAi/
├── src/
│   ├── config/
│   │   └── env.js              # Centralized environment loader & validator
│   ├── db/
│   │   └── index.js            # SQLite ledger database operations & schemas
│   ├── agent/
│   │   └── index.js            # LangGraph autonomous agent state machine
│   ├── routes/
│   │   ├── api.js              # RecovAI core API endpoints
│   │   └── demo.js             # Demo store product catalog & checkout routes
│   ├── middleware/
│   │   └── errorHandler.js     # Global Express error handler & process safety
│   ├── services/
│   │   └── razorpay.js         # Shared Razorpay client singleton & sync service
│   └── mailer.js               # Nodemailer recovery email dispatch
├── public/                     # Frontend dashboard & demo store SPA
├── server.js                   # Slim server entry point
├── Dockerfile                  # Production container definition
└── .env                        # Environment configuration
```

---

## 🛠️ Environment Configuration

Create a `.env` file in the root directory:

```env
# Required
GROQ_API_KEY="your_groq_api_key"
GROQ_MODEL="openai/gpt-oss-120b"
PORT=3000

# Razorpay Test Keys
RZP_TEST_KEY_ID="rzp_test_..."
RZP_TEST_KEY_SECRET="your_razorpay_secret"

# Optional SMTP Email Dispatch
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
```

---

## 🚀 Deployment Options

### Option 1: Render / Railway (Recommended)

1. Push your repository to **GitHub**.
2. Connect your repo on [Railway.app](https://railway.app) or [Render.com](https://render.com).
3. Set the **Build Command** to:
   ```bash
   npm install
   ```
4. Set the **Start Command** to:
   ```bash
   npm start
   ```
5. Add your Environment Variables (`GROQ_API_KEY`, `RZP_TEST_KEY_ID`, etc.) in the dashboard settings.
6. *(Optional)* Add a Persistent Disk volume attached to `/app/recovai.db` to preserve historical transaction SQLite data across deploys.

---

### Option 2: Docker Container Deployment

Build and run using Docker:

```bash
# Build Docker image
docker build -t recovai .

# Run container on port 3000
docker run -d -p 3000:3000 --env-file .env --name recovai-app recovai
```

---

### Option 3: VPS Deployment (DigitalOcean / AWS EC2 / Hetzner)

#### 1. Clone repository & install Node 20+:
```bash
git clone https://github.com/HarshChoudharyGit/Recov-AI.git
cd Recov-AI
npm install
```

#### 2. Process Management with PM2:
```bash
npm install -g pm2
pm2 start server.js --name recovai
pm2 save
pm2 startup
```

#### 3. Nginx Reverse Proxy & SSL (Certbot):
```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Run `sudo certbot --nginx -d yourdomain.com` for free HTTPS.

---

## 🔗 Razorpay Webhook Integration

In your **Razorpay Dashboard** > **Settings** > **Webhooks**:

- **Webhook URL**: `https://your-domain.com/api/v1/razorpay-webhook`
- **Active Events**:
  - `payment.failed`
  - `payment_link.paid`
  - `payment.captured`