# JBM EduConnect

**Homework & Video Sessions App for JBM Public School, Nasirpur**

A Progressive Web App (PWA) — students tap "Add to Home Screen" to install. No app store needed.

---

## Features

| Feature | Details |
|---|---|
| Homework | Text, PDF (secure viewer, no download), MCQ Quiz with auto-grading |
| Live Video | JaaS by 8x8 (Jitsi) — free, no Google account needed |
| Roles | Student · Teacher · Admin · Parent (read-only) |
| Push Notifications | Firebase FCM — alerts on new homework + live sessions |
| Parent Emails | Resend API — automatic email when homework is assigned |
| PWA | Install to home screen, works offline for cached pages |
| Security | JWT auth · bcrypt passwords · signed PDF URLs (15 min TTL) · Jitsi room IDs never exposed |

---

## Quick Start for JBM IT Team

### Step 1 — Sign up for free services (all free tiers)

| Service | URL | What you get |
|---|---|---|
| Supabase | https://supabase.com | Database + file storage |
| JaaS by 8x8 | https://jaas.8x8.vc | Video sessions (25 users free) |
| Firebase | https://console.firebase.google.com | Push notifications |
| Resend | https://resend.com | 3,000 emails/month free |
| Vercel | https://vercel.com | Frontend hosting |
| Railway | https://railway.app | Backend hosting |

### Step 2 — Set up the database

In your Supabase project → SQL Editor, run these files **in order**:

1. `database/schema.sql`
2. `database/rls_policies.sql`
3. `database/storage_policies.sql`
4. `database/seed.sql`

After seed.sql runs you will see the default credentials printed in the output.

### Step 3 — Fill in environment variables

Copy `infra/.env.example` → `server/.env` and fill in all values.

Add the `VITE_*` variables to Vercel Dashboard → Settings → Environment Variables.

### Step 4 — Deploy

Push the repo to GitHub. GitHub Actions (`.github/workflows/deploy.yml`) will automatically deploy:
- **Frontend** → Vercel
- **Backend** → Railway

Add these secrets to your GitHub repo (Settings → Secrets → Actions):
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `RAILWAY_TOKEN`

### Step 5 — First login

1. Open your Vercel URL in a phone browser
2. Tap **Add to Home Screen** → install PWA
3. Login: `jbm_admin` / `JBM@2025Admin`
4. **Change the password immediately**
5. Create teacher accounts via Admin Panel
6. Teachers create student accounts for their classes

---

## Default Credentials

| Role | Username | Password |
|---|---|---|
| Admin | `jbm_admin` | `JBM@2025Admin` |
| Demo Teacher | `demo_teacher` | `Teacher@123` |
| Demo Student | `demo_student` | `Student@123` |

> **Change all passwords immediately after first login.**

---

## JaaS Video Setup

1. https://jaas.8x8.vc → Sign up → Create app
2. Copy **App ID** → `JAAS_APP_ID`
3. API Keys → Generate Key Pair → copy **Key ID** → `JAAS_KEY_ID`
4. Download the **private key** (RS256) → `JAAS_PRIVATE_KEY`
5. Free tier: up to 25 participants per session

---

## Security

- Passwords: bcrypt (12 salt rounds)
- JWT access tokens: 7-day expiry; refresh tokens: 30-day expiry
- PDFs: signed URLs valid 15 minutes — no permanent public links ever issued
- Jitsi room IDs: UUID stored in DB, never sent to browser — only a short-lived JWT token
- Students can only join sessions their class is enrolled in, only when status = "live"
- Row Level Security enforced at database level for every table
- Parents: read-only — no join button, no uploads, no quiz submission

---

## Folder Structure

```
jbm-educonnect/
├── client/      React 18 + Vite + Tailwind PWA
├── server/      Node.js + Express API
├── database/    SQL schema, RLS policies, seed data
└── infra/       .env template, Vercel/Railway config, CI/CD
```

---

*JBM EduConnect v1.0 — Built for JBM Public School, Nasirpur*
