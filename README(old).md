# DocBridge 🏥
### Your Post-Consultation Health Companion

> *"Because understanding your health shouldn't require a medical degree."*

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Architecture](#architecture)
- [Microservices](#microservices)
- [Tech Stack](#tech-stack)
- [AI Integration](#ai-integration)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Azure Services](#azure-services)
- [Future Roadmap](#future-roadmap)

---

## Overview

DocBridge is a microservices-based post-consultation 
health companion application that bridges the gap between 
what doctors say and what patients actually understand.

Every day, millions of patients leave doctor consultations 
confused, holding a prescription they don't understand, 
with lab reports full of numbers that mean nothing to them. 
DocBridge solves this by providing an intelligent, 
personalized health companion that explains medicines, 
tracks symptoms, interprets lab reports, and answers 
every health question — all in plain, simple language.

---

## Problem Statement

Healthcare communication in India and across the world 
is fundamentally broken from the patient's perspective:

- **80% of patients** leave doctor consultations without 
  fully understanding what was said
- Prescriptions contain **multiple medicines with zero 
  explanation** of purpose, side effects, or interactions
- **Medical jargon** — inflammation, benign, differential 
  diagnosis — is incomprehensible to most patients
- Lab reports return with numbers that patients 
  **cannot interpret** without medical knowledge
- Patients are **too intimidated** to ask questions 
  during the 5-minute consultation window
- **Medication non-compliance** due to confusion causes 
  thousands of preventable health deteriorations annually
- People turn to **Google** and get terrified by 
  worst-case medical scenarios
- There is **no persistent, personalized** health 
  companion that knows YOUR medicines, YOUR conditions, 
  and YOUR history

---

## Solution

DocBridge provides patients with a comprehensive 
post-consultation companion that:

1. **Logs** every doctor consultation with diagnosis 
   and notes
2. **Explains** every prescribed medicine in plain 
   simple language
3. **Reminds** patients to take medicines at the 
   right time with the right instructions
4. **Interprets** lab report values against normal 
   ranges with simple explanations
5. **Tracks** symptoms and checks if they are related 
   to medicines or need doctor attention
6. **Generates** smart questions for the next 
   doctor visit
7. **Answers** any health question through an AI 
   companion that knows the patient's complete 
   health context
8. **Summarizes** the patient's current health 
   status in one unified dashboard

---

## Architecture

DocBridge follows a **3-Tier Microservices Architecture**:

```text
┌─────────────────────────────────────────────┐
│ TIER 1 — PRESENTATION                       │
│ React.js Frontend                           │
└─────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────┐
│ TIER 2 — LOGIC                              │
│                                             │
│ ┌──────────────┐ ┌───────────────────────┐ │
│ │ Auth Service │ │ Consultation Service  │ │
│ └──────────────┘ └───────────────────────┘ │
│                                             │
│ ┌──────────────┐ ┌───────────────────────┐ │
│ │ Prescription │ │ Reminder Service      │ │
│ │ Service      │ └───────────────────────┘ │
│ └──────────────┘                           │
│                                             │
│ ┌──────────────┐ ┌───────────────────────┐ │
│ │ Symptom      │ │ Lab Report Service    │ │
│ │ Tracker      │ └───────────────────────┘ │
│ └──────────────┘                           │
│                                             │
│ ┌──────────────┐ ┌───────────────────────┐ │
│ │ AI Companion │ │ Health Summary        │ │
│ └──────────────┘ │ Service               │ │
│                  └───────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────┐
│ TIER 3 — DATA                               │
│ PostgreSQL Database per Microservice        │
└─────────────────────────────────────────────┘
```


### Architecture Principles

- **Separation of Concerns** — Each microservice 
  handles one specific domain
- **Database per Service** — Each microservice owns 
  its data, no shared databases
- **API Gateway Pattern** — Single entry point for 
  all client requests
- **Independent Deployability** — Each service can 
  be deployed, scaled, and updated independently
- **3-Tier Compliance** — Presentation, Logic, and 
  Data layers are clearly separated

---

## Microservices

DocBridge is composed of 8 microservices:

### 1. Auth/User Service
**Port: 3001**

Handles all authentication and user management 
including registration, login, profile management, 
and family member profiles.

**Responsibilities:**
- User registration and login with JWT authentication
- Personal health profile management — age, blood group, 
  known conditions, allergies
- Family profile management — manage health profiles 
  for spouse, parents, and children
- Token validation for all other services

---

### 2. Consultation Service
**Port: 3002**

Manages the logging and retrieval of all doctor 
consultation records.

**Responsibilities:**
- Log doctor visits with diagnosis, notes, 
  doctor name, specialty, hospital, and date
- Maintain a chronological consultation timeline
- Link consultations to their corresponding prescriptions
- Support for multiple family member consultations

---

### 3. Prescription Service
**Port: 3003**

Manages all medicine prescriptions linked to 
consultations.

**Responsibilities:**
- Add medicines with name, dosage, frequency, 
  duration, and special instructions
- Track active vs completed medicine courses
- Record side effects experienced against 
  specific medicines
- Link prescriptions to consultations

---

### 4. Reminder Service
**Port: 3004**

Handles two types of reminders — medicine reminders 
and follow-up reminders.

**Responsibilities:**
- Create recurring medicine reminders based on 
  prescription schedule
- Handle before-food and after-food timing context
- Allow users to mark medicines as taken or skipped
- Track medication compliance over time
- Create one-time follow-up reminders for 
  appointments and tests
- Send push notifications via Azure Notification Hubs

---

### 5. Lab Report Service
**Port: 3005**

Manages manual entry and AI-powered interpretation 
of lab test results.

**Responsibilities:**
- Accept manual entry of lab test values with 
  test name, value, unit, and date
- Store normal range data for common tests
- Provide AI-powered explanations comparing 
  patient values against normal ranges
- Track trends of the same test over multiple dates
- Flag values significantly outside normal range

---

### 6. Symptom Tracker Service
**Port: 3006**

Allows patients to log symptoms they experience 
after diagnosis or starting medicines.

**Responsibilities:**
- Log daily symptoms with severity level and description
- Cross-reference symptoms with current medicines 
  to check if it is a known side effect
- AI assessment of whether a symptom warrants 
  immediate doctor attention
- Symptom history and pattern tracking
- Generate symptom summary for doctor visits

---

### 7. AI Companion Service
**Port: 3007**

The conversational intelligence layer of DocBridge — 
the heart of the application.

**Responsibilities:**
- Maintain persistent chat history per user
- Load complete user health context before 
  every response — conditions, medicines, 
  allergies, recent labs, recent symptoms
- Explain any medicine in plain language 
  personalized to the user's context
- Interpret lab report values conversationally
- Assess symptom severity and possible causes
- Generate smart questions for upcoming 
  doctor consultations
- Answer any general health query with 
  appropriate medical disclaimers
- Always recommend professional consultation 
  for serious concerns

---

### 8. Health Summary Service
**Port: 3008**

Aggregates data from all services into a single 
unified health dashboard view.

**Responsibilities:**
- Compile current active conditions from 
  consultation history
- List all currently active medicines
- Show today's pending medicine reminders
- Display upcoming follow-up appointments and tests
- Highlight recent lab values that are outside 
  normal range
- Show recently logged symptoms
- Provide a complete at-a-glance health snapshot

---

## Tech Stack

### Frontend
- **React.js** — Component-based UI framework
- **Axios** — HTTP client for API calls
- **React Router** — Client-side navigation
- **CSS / Tailwind CSS** — Styling

### Backend
- **Node.js** — Runtime environment
- **Express.js** — Web framework for each microservice
- **JWT** — Authentication tokens
- **bcrypt** — Password hashing

### Database
- **PostgreSQL** — Relational database
- One independent PostgreSQL instance per microservice

### AI
- **Azure OpenAI Service (GPT-4)** — Powers the 
  AI Companion and all intelligent features

### DevOps
- **Docker** — Containerization of each microservice
- **Azure Kubernetes Service (AKS)** — Container 
  orchestration and deployment
- **Azure Container Registry (ACR)** — 
  Container image storage
- **GitHub Actions** — CI/CD pipeline

### Azure Services
- **Azure OpenAI** — AI and NLP capabilities
- **Azure Kubernetes Service** — Deployment 
  and orchestration
- **Azure Container Registry** — Docker image registry
- **Azure Database for PostgreSQL** — 
  Managed database service
- **Azure Notification Hubs** — Push notifications
- **Azure Blob Storage** — File and document storage
- **Azure Key Vault** — Secrets and credentials management
- **Azure API Management** — API Gateway

---

## AI Integration

### Overview

The AI Companion Service is powered by 
**Azure OpenAI (GPT-4)**. What makes DocBridge's 
AI different from simply asking ChatGPT a health 
question is **context persistence and personalization.**

Every time a user interacts with the AI, the system:

1. Fetches the user's complete health profile 
   — conditions, allergies, age
2. Fetches all currently active medicines
3. Fetches recent consultation diagnosis
4. Fetches recent lab report values
5. Fetches recently logged symptoms
6. Builds a personalized system prompt with 
   all this context
7. Sends the user's question along with this 
   context to Azure OpenAI
8. Returns a response that is specific to 
   THIS patient — not a generic answer

### System Prompt Structure

```md
You are DocBridge, a friendly, empathetic, and knowledgeable health companion.
Your role is to help patients understand their health in simple, clear, non-technical language.

---

## Current Patient Context

- Name: {name}
- Age: {age}
- Known Medical Conditions: {conditions}
- Known Allergies: {allergies}
- Currently Active Medicines: {medicines}
- Recent Diagnosis: {diagnosis}
- Recent Lab Values: {lab_values}
- Recently Logged Symptoms: {symptoms}

---

## Rules You Must Always Follow

1. Explain everything in simple language — no medical jargon
2. Always be empathetic, calm, and reassuring
3. Personalize every response to this patient's specific context
4. Never diagnose a condition
5. Always recommend consulting a doctor for serious concerns
6. When explaining medicines, always consider the patient's allergies and other medicines
7. When a symptom could indicate something serious, clearly and calmly say so and recommend immediate medical attention
```

# Sample Conversations

---

## Medicine Explanation

**User:** What is Metformin 500mg that my doctor prescribed?

**DocBridge:**  
Metformin is a medicine used to control blood sugar levels — which makes sense given your recent diabetes diagnosis. It works by reducing the amount of sugar your liver releases into your blood and helps your body use insulin more effectively.

Since you have listed a Penicillin allergy, you will be glad to know Metformin has no relation to that at all — completely safe for you.

Take it after meals to avoid stomach upset. In the first week you might feel mild nausea or loose stools — this is very common and usually settles on its own.

Let me know if you want me to check if it interacts with any of your other medicines.

---

## Lab Report Interpretation

**User:** My HbA1c result came back as 8.2. What does this mean?

**DocBridge:**  
HbA1c is a test that tells us what your average blood sugar level has been over the past 3 months — think of it as a 3-month blood sugar report card.

The target for most diabetic patients is below 7.0. Your result of 8.2 means your blood sugar has been running a bit higher than the ideal target over the past few months.

This is not an emergency — but it is something your doctor will want to address, possibly by adjusting your Metformin dose or giving you additional guidance on diet.

Would you like me to add this to your question list for your next doctor visit?

---

## Smart Question Generation

**User:** I have a follow-up with my doctor tomorrow. What should I ask?

**DocBridge:**  
Based on your current situation, here are the questions I would suggest bringing:

- My HbA1c is 8.2 — should we adjust my Metformin dosage?
- I have been experiencing mild nausea since starting Metformin — is this expected to pass?
- Are there specific foods I should avoid with my current medicines?
- How often should I check my blood sugar at home?
- When should I schedule my next HbA1c test?
- I logged dizziness twice this week — could this be related to my medicine?



---

## Database Schema

### Auth Service

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    age INTEGER,
    blood_group VARCHAR(10),
    known_conditions TEXT[],
    allergies TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    relation VARCHAR(50) NOT NULL,
    age INTEGER,
    known_conditions TEXT[],
    allergies TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);
```


### Consultation Service

```sql
CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    doctor_name VARCHAR(100),
    specialty VARCHAR(100),
    hospital VARCHAR(150),
    visit_date DATE NOT NULL,
    diagnosis TEXT,
    notes TEXT,
    follow_up_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);
```


### Prescription Service

```sql
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    consultation_id UUID,
    medicine_name VARCHAR(150) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration_days INTEGER,
    instructions TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE side_effects_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES prescriptions(id),
    user_id UUID NOT NULL,
    effect_description TEXT NOT NULL,
    severity VARCHAR(20),
    logged_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);
```


### Reminder Service

```sql
CREATE TABLE medicine_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    prescription_id UUID NOT NULL,
    medicine_name VARCHAR(150),
    reminder_time TIME NOT NULL,
    meal_instruction VARCHAR(50),
    is_taken BOOLEAN DEFAULT FALSE,
    is_skipped BOOLEAN DEFAULT FALSE,
    reminder_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE followup_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reminder_title VARCHAR(200) NOT NULL,
    reminder_description TEXT,
    reminder_date DATE NOT NULL,
    reminder_time TIME,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```


### Lab Report Service

```sql
CREATE TABLE lab_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    test_name VARCHAR(150) NOT NULL,
    value FLOAT NOT NULL,
    unit VARCHAR(50),
    normal_min FLOAT,
    normal_max FLOAT,
    lab_name VARCHAR(150),
    test_date DATE NOT NULL,
    ai_explanation TEXT,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```


### Symptom Tracker Service

```sql
CREATE TABLE symptoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    symptom_name VARCHAR(150) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    possible_cause VARCHAR(100),
    ai_assessment TEXT,
    needs_doctor_attention BOOLEAN DEFAULT FALSE,
    logged_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);
```


### AI Companion Service

```sql
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

# API Endpoints

---

## Auth Service — `/api/auth`

```text
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login and get token
GET    /api/auth/profile           Get user profile
PUT    /api/auth/profile           Update user profile
POST   /api/auth/family/add        Add family member
GET    /api/auth/family            Get all family members
PUT    /api/auth/family/:id        Update family member
DELETE /api/auth/family/:id        Remove family member
```

---

## Consultation Service — `/api/consultations`

```text
POST   /api/consultations          Add new consultation
GET    /api/consultations          Get all consultations
GET    /api/consultations/:id      Get single consultation
PUT    /api/consultations/:id      Update consultation
DELETE /api/consultations/:id      Delete consultation
```

---

## Prescription Service — `/api/prescriptions`

```text
POST   /api/prescriptions                    Add prescription
GET    /api/prescriptions/active             Get active medicines
GET    /api/prescriptions/history            Get past medicines
GET    /api/prescriptions/:id                Get single prescription
PUT    /api/prescriptions/:id                Update prescription
DELETE /api/prescriptions/:id                Delete prescription
POST   /api/prescriptions/:id/sideeffect     Log side effect
GET    /api/prescriptions/:id/sideeffects    Get side effects
```

---

## Reminder Service — `/api/reminders`

```text
POST   /api/reminders/medicine              Create medicine reminder
GET    /api/reminders/medicine/today        Get today's reminders
PUT    /api/reminders/medicine/:id/taken    Mark as taken
PUT    /api/reminders/medicine/:id/skip     Mark as skipped
GET    /api/reminders/medicine/compliance   Get compliance stats
POST   /api/reminders/followup              Create follow-up reminder
GET    /api/reminders/followup              Get all follow-up reminders
PUT    /api/reminders/followup/:id/done     Mark follow-up complete
DELETE /api/reminders/followup/:id          Delete follow-up reminder
```

---

## Lab Report Service — `/api/labreports`

```text
POST   /api/labreports              Add lab report entry
GET    /api/labreports              Get all lab reports
GET    /api/labreports/:id          Get single report
DELETE /api/labreports/:id          Delete report
POST   /api/labreports/explain      Get AI explanation for values
GET    /api/labreports/trends/:name Get trend for a specific test
```

---

## Symptom Tracker Service — `/api/symptoms`

```text
POST   /api/symptoms               Log a symptom
GET    /api/symptoms               Get all symptoms
GET    /api/symptoms/:id           Get single symptom
DELETE /api/symptoms/:id           Delete symptom log
GET    /api/symptoms/summary       Get symptom summary for doctor visit
```

---

## AI Companion Service — `/api/ai`

```text
POST   /api/ai/chat                Send message to AI companion
GET    /api/ai/chat/history        Get chat history
DELETE /api/ai/chat/history        Clear chat history
POST   /api/ai/questions           Generate questions for next visit
```

---

## Health Summary Service — `/api/summary`

```text
GET    /api/summary                Get complete health summary
GET    /api/summary/medicines      Get active medicines summary
GET    /api/summary/reminders      Get today's reminders summary
GET    /api/summary/labs           Get recent flagged lab values
GET    /api/summary/symptoms       Get recent symptoms summary
```

---

# Project Structure

```text
docbridge/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AIChat.jsx
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Consultations.jsx
│   │   │   ├── Prescriptions.jsx
│   │   │   ├── Reminders.jsx
│   │   │   ├── LabReports.jsx
│   │   │   ├── Symptoms.jsx
│   │   │   └── AICompanion.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── Dockerfile
│
├── services/
│   │
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── consultation-service/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── prescription-service/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── reminder-service/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── labreport-service/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── symptom-service/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── ai-companion-service/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── health-summary-service/
│       ├── src/
│       │   ├── routes/
│       │   ├── controllers/
│       │   └── index.js
│       ├── package.json
│       └── Dockerfile
│
├── k8s/
│   ├── auth-deployment.yaml
│   ├── consultation-deployment.yaml
│   ├── prescription-deployment.yaml
│   ├── reminder-deployment.yaml
│   ├── labreport-deployment.yaml
│   ├── symptom-deployment.yaml
│   ├── ai-companion-deployment.yaml
│   ├── health-summary-deployment.yaml
│   └── frontend-deployment.yaml
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── docker-compose.yml
└── README.md
```

---

# Getting Started

## Prerequisites

```text
- Node.js v18+
- Docker Desktop
- PostgreSQL
- Azure Account
- Azure OpenAI Service access
```

---

## Environment Variables

Create a `.env` file in each service:

```text
# Auth Service
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/auth_db
JWT_SECRET=your_jwt_secret

# AI Companion Service
PORT=3007
DATABASE_URL=postgresql://user:password@localhost:5432/ai_db
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_KEY=your_azure_openai_key
AZURE_OPENAI_DEPLOYMENT=gpt-4

# Reminder Service
PORT=3004
DATABASE_URL=postgresql://user:password@localhost:5432/reminder_db
AZURE_NOTIFICATION_HUB_CONNECTION=your_connection_string
```

---

# Running Locally with Docker Compose

```bash
# Clone the repository
git clone https://github.com/yourusername/docbridge.git

# Navigate to project
cd docbridge

# Start all services
docker-compose up --build

# Frontend runs on http://localhost:3000
# Services run on ports 3001-3008
```

---

# Deployment

## CI/CD Pipeline — GitHub Actions

```text
Developer pushes code to GitHub
          ↓
GitHub Actions workflow triggers
          ↓
Build Docker images for changed services
          ↓
Push images to Azure Container Registry
          ↓
Deploy updated images to AKS
          ↓
Application live on Azure
```

---

## Azure Kubernetes Service Deployment

```bash
# Login to Azure
az login

# Connect to AKS cluster
az aks get-credentials --resource-group docbridge-rg \
                        --name docbridge-cluster

# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods
kubectl get services
```

---

# Azure Services

| Azure Service | Purpose in DocBridge |
|---|---|
| Azure Kubernetes Service | Host and orchestrate all microservices |
| Azure Container Registry | Store Docker images for all services |
| Azure OpenAI Service | Power AI Companion with GPT-4 |
| Azure Database for PostgreSQL | Managed PostgreSQL per microservice |
| Azure Notification Hubs | Medicine and follow-up push notifications |
| Azure Blob Storage | Document and file storage |
| Azure Key Vault | Secure storage of API keys and secrets |
| Azure API Management | API Gateway for unified service entry |

---

# Future Roadmap

| Phase | Features |
|---|---|
| Phase 1 — MVP | Core consultation logging, prescription management, AI companion, reminders |
| Phase 2 | Lab report interpreter, symptom tracker, health summary dashboard |
| Phase 3 | Family health profiles, multi-patient management |
| Phase 4 | Regional language support — Hindi, Tamil, Telugu, Bengali |
| Phase 5 | Doctor-facing version — send patient summary to doctor before visit |
| Phase 6 | Integration with hospital systems and health records |
| Phase 7 | Wearable device data integration |

---

# Key Differentiators

| Feature | DocBridge | Generic AI (ChatGPT) | Health Apps |
|---|---|---|---|
| Knows YOUR medicines | ✅ | ❌ | ❌ |
| Knows YOUR conditions | ✅ | ❌ | ❌ |
| Knows YOUR allergies | ✅ | ❌ | ❌ |
| Persistent health history | ✅ | ❌ | ✅ |
| Medicine reminders | ✅ | ❌ | ✅ |
| Post-consultation focus | ✅ | ❌ | ❌ |
| Lab report interpretation | ✅ | ⚠️ Generic only | ❌ |
| Smart question generation | ✅ | ⚠️ Generic only | ❌ |
| Symptom-medicine correlation | ✅ | ❌ | ❌ |

---
