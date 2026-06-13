# DocBridge

> **"Because understanding your health shouldn't require a medical degree."**

DocBridge is a production-grade, AI-powered post-consultation health companion. Built on a resilient microservices architecture, it bridges the gap between complex clinical jargon and patient understanding by translating prescriptions, doctor consultation logs, and lab results into clear, actionable, plain-language insights.

The platform provides patients with medication scheduling, smart alerts, family profile management, and a unified health timeline—all while maintaining high security, strict validation, and database integrity.

---

## 📖 Table of Contents

1. [Features](#-features)
2. [Architecture & Service Mesh](#-architecture--service-mesh)
3. [Tech Stack](#-tech-stack)
4. [Project Structure](#-project-structure)
5. [Environment Variables & AI Configs](#-environment-variables--ai-configs)
6. [Security & Production Hardening](#-security--production-hardening)
7. [Getting Started (Local Development)](#-getting-started-local-development)
    - [Prerequisites](#prerequisites)
    - [First-Time Setup (Run Once)](#first-time-setup-run-once)
    - [Starting the Application](#starting-the-application)
    - [Stopping the Application](#stopping-the-application)
8. [Important Notes for Windows Users](#-important-notes-for-windows-users)
9. [Troubleshooting & Diagnostics](#-troubleshooting--diagnostics)
10. [Testing (Regression Suite)](#-testing-regression-suite)
11. [Azure Deployment Assets](#-azure-deployment-assets)
12. [Future Roadmap](#-future-roadmap)
13. [License](#-license)

---

## 🌟 Features

*   **Consultation Logger** — Record every doctor visit with diagnoses, clinical notes, and physician information.
*   **Prescription Tracker** — Manage active medications, track dosage instructions, and log potential side effects.
*   **Medicine Reminders** — Configure scheduled medicine timers with specific before/after food rules.
*   **Follow-up Reminders** — Schedule medical checkups, subsequent doctor appointments, or testing slots.
*   **Lab Report Interpreter** — Log and review blood work values with automatic normal range visual indicators.
*   **Symptom Diary** — Maintain a daily timeline of symptoms with severity scoring and descriptions.
*   **Family Profiles** — Seamlessly manage and toggle medical records for multiple family members under a single unified account.
*   **Health Dashboard** — View an aggregated health status summary showing active medications, upcoming follow-ups, and recent symptoms.
*   **AI Health Companion** — Chat in real-time with a virtual health companion (requires Azure OpenAI or Azure AI Foundry credentials; degrades gracefully with a fallback if unconfigured).

---

## 🏗️ Architecture & Service Mesh

DocBridge is engineered as a distributed microservice network, fronted by an API Gateway. The entire ecosystem is deployed across two dedicated virtual servers in production:

*   **VM1 (Application Server)**: Runs Nginx as a reverse proxy, the React Single Page Application (SPA), the Express-based API Gateway, and all 9 standalone Express microservices managed continuously by PM2.
*   **VM2 (Database Server)**: Houses a dedicated PostgreSQL 15 server, isolating data storage and enforcing security barriers.
*   **External Service**: Integrates with Azure OpenAI services or Azure AI Foundry for advanced clinical text summarization and conversation features.

```
VM1 (Application Server)                              VM2 (Database Server)
┌───────────────────────────────────────────────┐     ┌─────────────────────┐
│  Nginx (Port 80/443)                          │     │  PostgreSQL :5432   │
│    ├── /* → React SPA (:5173 / static)        │     │  (docbridge_db)     │
│    └── /api/* → API Gateway (:3000)           │     └─────────────────────┘
│                                               │                ▲
│  API Gateway (Port 3000)                      │                │
│    ├── /api/v1/auth         → Port 3001       │                │
│    ├── /api/v1/consultations→ Port 3002       │───── TCP ──────┘
│    ├── /api/v1/prescriptions→ Port 3003       │
│    ├── /api/v1/reminders    → Port 3004       │
│    ├── /api/v1/lab-reports  → Port 3005       │
│    ├── /api/v1/symptoms     │ Port 3006       │
│    ├── /api/v1/ai           → Port 3007       │───── HTTPS ────┐
│    ├── /api/v1/health-summary→Port 3008       │                ▼
│    └── /api/v1/family       → Port 3009       │       [ Azure OpenAI / ]
└───────────────────────────────────────────────┘       [ Azure AI Agent ]
```

### Port Mapping Summary

| Service Name | Port | Description |
| :--- | :--- | :--- |
| **API Gateway** | `3000` | Single entry point; handles rate limiting, authentication headers, and path routing |
| **Auth Service** | `3001` | Manages user registration, secure login sessions, JWT tokens, and user profiles |
| **Consultation Service** | `3002` | Manages patient physician visit logs and medical diagnoses |
| **Prescription Service** | `3003` | Tracks active medications, dosages, and drug side-effect records |
| **Reminder Service** | `3004` | Handles dosage reminders and checkup follow-up alerts |
| **Lab Report Service** | `3005` | Logs and monitors clinical blood panel variables |
| **Symptom Service** | `3006` | Manages severity logging and descriptions of physical symptoms |
| **AI Companion Service** | `3007` | Connects securely to AI endpoints for clinical companion chats |
| **Health Summary Service** | `3008` | Generates aggregated dashboard snapshots and unified timelines |
| **Family Service** | `3009` | Manages sub-profiles for family members linked to an account |

---

## 💻 Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Vanilla CSS, Redux Toolkit, Axios, Recharts, Framer Motion | Premium responsive UI (unified scrolling), centralized global state, and fluid data charts |
| **API Gateway** | Express, http-proxy-middleware, express-rate-limit, node-cache | Handles incoming reverse proxying, CORS policy preflights, and request limits |
| **Backend Services** | Express, Sequelize ORM, Zod, bcryptjs | Standalone Node.js services utilizing relational database query interfaces |
| **Database** | PostgreSQL 15 | Strict referential integrity, foreign constraints, and relation mapping |
| **Process Manager**| PM2 | Multi-process daemon management, clustering, and log rotation |
| **Web Server** | Nginx | Enforces production-grade static asset serving and SSL termination |
| **Authentication** | JWT (Dual Access + Refresh Tokens) | Stateless microservice authorization; 15-minute access, 7-day refresh lifecycle |
| **Containerization**| Docker & Docker Compose | Used to orchestrate isolated PostgreSQL services in local development |

---

## 📂 Project Structure

```text
docbridge/
├── .env                  # Root environment variables
├── docker-compose.yml    # Development PostgreSQL database container (Port 5433)
├── ecosystem.config.js   # PM2 process configuration for clustering
├── package.json          # Root dependencies (cross-env, axios for test running)
├── database/             # Shared database structure
│   ├── config/           # Sequelize database credentials config
│   ├── migrations/       # SQL Schema definition scripts (11 files)
│   └── seeders/          # Initial sandbox dataset seeding scripts (6 files)
├── gateway/              # API Gateway Service (Port 3000)
│   ├── src/
│   │   ├── app.js        # Express middleware and rate limit loading
│   │   ├── proxy/        # http-proxy-middleware path configuration
│   │   └── middleware/   # JWT verification, CORS mapping, rate limit rules
│   └── .env              # Gateway config parameters
├── frontend/             # Single Page Application
│   ├── src/
│   │   ├── api/          # Interceptors, authorization headers, and API methods
│   │   ├── context/      # React Auth Context state hooks
│   │   ├── components/   # Modular dashboard UI containers
│   │   └── pages/        # Fully functional microservice views (LoginPage.jsx, RegisterPage.jsx, etc.)
│   └── .env              # Frontend client config
├── services/             # Autonomous microservices
│   ├── auth-service/     # Handles registrations, login flows, profiles (Port 3001)
│   ├── consultation-service/ # Logs consultations and visits (Port 3002)
│   ├── prescription-service/ # Tracks medication dosages and schedules (Port 3003)
│   ├── reminder-service/ # Schedules dosage alerts and appointments (Port 3004)
│   ├── labreport-service/# Logs blood panels and indicators (Port 3005)
│   ├── symptom-service/  # Stores symptom diaries and descriptions (Port 3006)
│   ├── ai-companion-service/ # Interfaces with Azure OpenAI GPT-4 / AI Foundry (Port 3007)
│   ├── health-summary-service/ # Aggregates dashboard summaries (Port 3008)
│   └── family-service/   # Manages patient family links (Port 3009)
├── azure/                # Enterprise Deployment Assets
│   ├── aks-deployment.yml# Kubernetes cluster configuration yml
│   ├── key-vault-setup.md# Azure Key Vault CSI provider integration guide
│   ├── postgres-migration.md # Flexible Server PostgreSQL migration guide
│   └── redis-migration.md    # Gateway Rate Limiter to Azure Redis guide
├── deploy/               # VM setup and deploy scripts
└── tests/                # Verification Suite
    ├── health-check.js   # Automated API Gateway check script
    └── regression/       # End-to-end security, stability, integrity tests
```

---

## ⚙️ Environment Variables & AI Configs

To run the application, configure environment variables across all services. 

### 1. General & Database Variables (Required)

| Variable | Description | Recommended/Default Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Mode of the application runtime | `development` (local) or `production` |
| `PORT` | Listening port for the specific service | Automatically loaded based on the service mapping |
| `CORS_ORIGIN` | Allowed domains for web requests | `http://localhost:5173` |
| `DB_HOST` | Database server address | `localhost` (local dev) or VM2 Private IP |
| `DB_PORT` | Database server port | `5433` (local Docker) or `5432` (production) |
| `DB_NAME` | Database catalog name | `docbridge_db` |
| `DB_USER` | DB administrative user | `docbridge_user` |
| `DB_PASSWORD` | DB secure access password | `DocBridge@2024Secure` |
| `JWT_ACCESS_SECRET` | Secret key used to sign Access JWTs | *Generate a strong 32+ character key* |
| `JWT_REFRESH_SECRET`| Secret key used to sign Refresh JWTs | *Generate a strong 32+ character key* |

> [!WARNING]
> In local development, the PostgreSQL Docker container exposes and maps to port **`5433`** to prevent conflicts with native local PostgreSQL engines running on the default `5432`. Ensure that all service `.env` files point to `DB_PORT=5433` during local runs.

---

### 2. Dual-Mode AI Configuration (For `ai-companion-service`)

The `ai-companion-service` dynamically checks the format of `AZURE_OPENAI_ENDPOINT` in `services/ai-companion-service/.env` and automatically switches its routing layout and authentication headers.

#### Mode A: Standard Azure OpenAI Service (Default)
Use this if you deployed a model on a standard Azure OpenAI Service resource.
*   **Endpoint URL Example**: `https://your-resource-name.openai.azure.com/`
*   **Auth Header Sent**: `api-key: <key>`
*   **Request URL Format**: `{endpoint}/openai/deployments/{deploymentName}/chat/completions?api-version={version}`
*   **Config in `.env`**:
    ```ini
    AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
    AZURE_OPENAI_KEY=your_azure_api_key
    AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
    AZURE_OPENAI_API_VERSION=2024-02-15-preview
    ```

#### Mode B: Azure AI Foundry Project Endpoint
Use this if your endpoint is hosted within an Azure AI Foundry (AI Studio) Project gateway.
*   **Endpoint URL Example**: `https://your-project-resource.services.ai.azure.com/openai/v1`
*   **Auth Header Sent**: `Authorization: Bearer <key>`
*   **Request URL Format**: `{endpoint}/chat/completions` (OpenAI-compatible route with no api-version query param needed)
*   **Config in `.env`**:
    ```ini
    AZURE_OPENAI_ENDPOINT=https://your-project-resource.services.ai.azure.com/openai/v1
    AZURE_OPENAI_KEY=your_project_or_agent_api_key
    AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4.1
    ```

---

## 🛡️ Security & Production Hardening

*   **Stateless Token Auth Lifecycle**: Dual JWT validation. Access tokens expire in 15 minutes, while refresh tokens reside in cookie/local storage.
*   **Password Hashing**: Passwords are securely hashed using `bcryptjs` with salt round `12`.
*   **API Gateway Rate Limiting**: 
    *   Auth endpoints (`/login`, `/register`): **10 requests per 15 minutes** per IP.
    *   AI Companion endpoint (`/ai`): **20 requests per 15 minutes** per User.
    *   All other routes: **100 requests per 15 minutes** per IP.
*   **Payload Size Restrictions**: Maximum request body size capped at **`100KB`** across the gateway, protecting backend nodes from heap memory exhaustion attacks.
*   **Service Isolation**: Backend microservices bind strictly to `127.0.0.1`. They accept connections exclusively via Gateway routing.

---

## 🚀 Getting Started (Local Development)

### Prerequisites

*   **Node.js**: Version `v18` or higher installed (Version `v24` recommended).
*   **Docker Desktop**: Running locally.
*   **PM2**: Process manager (run via `npx` or install globally: `npm install -g pm2`).

---

### First-Time Setup (Run Once)

#### 1. Clone the Repository
```bash
git clone https://github.com/your-org/docbridge.git
cd docbridge
```

#### 2. Copy the Environment Configuration Files
Copy the template files (`.env.example`) to their active `.env` files.

*   **On Windows (PowerShell)**:
    ```powershell
    Copy-Item .env.example .env
    Copy-Item gateway/.env.example gateway/.env
    Copy-Item services/auth-service/.env.example services/auth-service/.env
    Copy-Item services/consultation-service/.env.example services/consultation-service/.env
    Copy-Item services/prescription-service/.env.example services/prescription-service/.env
    Copy-Item services/reminder-service/.env.example services/reminder-service/.env
    Copy-Item services/labreport-service/.env.example services/labreport-service/.env
    Copy-Item services/symptom-service/.env.example services/symptom-service/.env
    Copy-Item services/ai-companion-service/.env.example services/ai-companion-service/.env
    Copy-Item services/health-summary-service/.env.example services/health-summary-service/.env
    Copy-Item services/family-service/.env.example services/family-service/.env
    ```

*   **On macOS / Linux (Terminal)**:
    ```bash
    cp .env.example .env
    cp gateway/.env.example gateway/.env
    for dir in services/*/; do
      cp "$dir.env.example" "$dir.env"
    done
    ```

#### 3. Install Microservice Dependencies
*   **On Windows (PowerShell)**:
    ```powershell
    npm install
    cd gateway; npm install; cd ..
    Get-ChildItem services/ -Directory | ForEach-Object { cd $_.FullName; npm install; cd ../.. }
    ```

*   **On macOS / Linux (Terminal)**:
    ```bash
    npm install
    for dir in gateway services/*/; do
      (cd "$dir" && npm install)
    done
    ```

#### 4. Spin Up the Database Container
Launch the isolated PostgreSQL instance:
```bash
docker-compose up -d postgres
```

#### 5. Execute Database Migrations and Seeders
Initialize your database schemas and pre-populate mock medical history records:
```bash
cd database
npm run migrate
npm run seed
cd ..
```

#### 6. Install Frontend Client Dependencies
```bash
cd frontend
npm install
cd ..
```

---

### Starting the Application

Follow these steps to run the application locally:

#### Step 1: Start Database & Microservices
Ensure Docker Desktop is open and run the database container, then launch all 10 backend processes (1 gateway + 9 microservices) using PM2 in the background:
```bash
# Spin up PostgreSQL
docker-compose up -d postgres

# Start all microservices in background daemon
npx pm2 start ecosystem.config.js
```
*(Tip: On Windows platforms, if PM2 daemons exit when closing the terminal, you can run `npx pm2 start ecosystem.config.js --no-daemon` to keep them active in a dedicated terminal window).*

#### Step 2: Start Frontend Client
In a new terminal window, navigate to the `frontend` folder and spin up the Vite development server:
```bash
cd frontend
npm run dev
```
The client is now live at **`http://localhost:5173`**.

#### Step 3: Verify Network Status (Recommended)
You can test the connectivity of all 10 processes to the API Gateway at any time by running the built-in diagnostic tool:
```bash
node tests/health-check.js
```
*Successful Output:*
```text
=== DOCBRIDGE SERVICE HEALTH CHECK ===
✅ Gateway          — 200 OK   (20ms)
✅ Auth             — 200 OK   (1482ms)
✅ Consultations    — 200 OK   (262ms)
...
=====================================
9/9 services healthy
```

🔑 **Demo Sandbox Account Credentials**:
*   **Email**: `arjun.mehta@gmail.com`
*   **Password**: `Arjun@123`

---

### Stopping the Application

To safely shut down the entire development stack and prevent database corruption:

#### Step 1: Stop Frontend Client
In the frontend terminal, press `Ctrl + C` to close the Vite server.

#### Step 2: Stop and Delete Backend Processes
Stop the microservice nodes and free up their respective ports (`3000` to `3009`):
```bash
npx pm2 stop all
npx pm2 delete all
```

#### Step 3: Shut Down the Database Container
```bash
docker-compose down
```

---

## 🪟 Important Notes for Windows Users

*   **Vite Port conflicts (Port 5173)**: If Vite starts on `5174` (or other ports), another process is occupying `5173`. Find the PID and terminate it:
    ```powershell
    # Search for Port 5173 PID
    netstat -ano | findstr :5173
    
    # Force close the PID
    taskkill /PID <PID-Number> /F
    ```
*   **PM2 Logging**: To inspect logs of any running service on Windows, run:
    ```bash
    npx pm2 logs docbridge-ai-companion
    ```
*   **PM2 Configuration Updates**: If you edit `.env` values, you must restart the corresponding process with the `--update-env` flag to load the modifications:
    ```bash
    npx pm2 restart docbridge-ai-companion --update-env
    ```

---

## 🔍 Troubleshooting & Diagnostics

| Issue | Root Cause | Resolution |
| :--- | :--- | :--- |
| **"DeploymentNotFound" (404) for AI Chatbot** | The deployment name in Azure OpenAI Studio doesn't match `AZURE_OPENAI_DEPLOYMENT_NAME` in `.env`. | Verify your **custom deployment name** in Azure OpenAI Studio -> Deployments, update the `.env` value, and run `npx pm2 restart docbridge-ai-companion --update-env`. |
| **Registration / Login fails with CORS errors** | Vite started on port `5174` instead of `5173`, causing CORS preflight blocks. | Clear the port conflicts on `5173` or add `http://localhost:5174` to `CORS_ORIGIN` variables in your service envs. |
| **Microservices show Red "error" status in PM2** | Database was not ready to receive connections when the microservice nodes booted. | Bring up the Postgres container, wait 5 seconds, then restart PM2: `npx pm2 restart all`. |

---

## 🧪 Testing (Regression Suite)

Ensure all PM2 backend services are online before launching the test suite.

```bash
# Runs the full regression test suite
npm run test:regression

# Run specific validation suites:
npm run test:security   # Payload limits, XSS parsing, rate limits
npm run test:stability  # Outage resilience and graceful fallbacks
npm run test:integrity  # Constraints, double-deletions, validations
npm run test:crud       # Database entry creation, edits, and reads
```

---

## ☁️ Azure Deployment Assets

All production Kubernetes assets, Ingress configurations, and database migration steps are documented inside the [**`azure/`**](./azure) folder:
*   [`aks-deployment.yml`](./azure/aks-deployment.yml) — Production Kubernetes deployment manifests.
*   [`key-vault-setup.md`](./azure/key-vault-setup.md) — Steps for secure database credentials injection using Key Vault.
*   [`postgres-migration.md`](./azure/postgres-migration.md) — Steps for migrating data to Azure Database for PostgreSQL Flexible Server.
*   [`redis-migration.md`](./azure/redis-migration.md) — Integrating Ingress rate limiters with Azure Cache for Redis.

---

## 🗺️ Future Roadmap

*   **Phase 1** — Consultation logs, prescriptions, medicine reminders, family member lists, health dashboard (✅ Complete)
*   **Phase 2** — Lab reports interpreter, symptom diary logging, dashboard aggregation (✅ Complete)
*   **Phase 3** — AI Companion chat with dual Azure OpenAI & AI Foundry support (✅ Complete)
*   **Phase 4** — Multilingual localization (Hindi, Tamil, Telugu, Bengali) (Planned)
*   **Phase 5** — Physician clinical interface dashboard (Planned)

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
