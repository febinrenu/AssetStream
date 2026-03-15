# AssetStream

**AI-Powered Equipment-as-a-Service (XaaS) Asset Finance Platform**

AssetStream is a production-grade platform for managing leased industrial assets — tracking fleet utilization, lease contracts, invoices, maintenance health, risk scores, and AI-driven remarketing recommendations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, Django 5, Django REST Framework, Celery 5, Redis 7 |
| Database | PostgreSQL 16 |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, TanStack Query v5 |
| AI | Groq API (Qwen3-32B), scikit-learn, Framer Motion |
| Infra | Docker Compose, Nginx, Render (production) |

---

## Quick Start (Local)

### Prerequisites
- Docker Desktop

### 1. Clone the repo
```bash
git clone https://github.com/febinrenu/AssetStream.git
cd AssetStream
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add your GROQ_API_KEY
```

### 3. Boot the stack
```bash
docker-compose up --build
```

### 4. Seed demo data
```bash
docker-compose exec api python manage.py seed_demo_data
```

### 5. Open the app
| Service | URL |
|---|---|
| App | http://localhost |
| API Docs | http://localhost/api/docs/ |
| pgAdmin | http://localhost:5050 |

---

## Demo Credentials

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Admin@123` |
| Analyst | `analyst` | `Analyst@123` |
| Lessee | `lessee` | `Lessee@123` |

---

## Project Structure

```
AssetStream/
├── backend/                  Django API
│   ├── accounts/             Auth & user management
│   ├── originations/         Assets & lease contracts
│   ├── servicing/            Invoices, usage logs, IoT telemetry
│   ├── payments/             Payment records & dunning
│   ├── remarketing/          ML-based asset valuation
│   ├── ai_engine/            Risk scoring, maintenance predictions, AI chat
│   ├── workflows/            Approval workflows
│   ├── communications/       Notifications & audit logs
│   └── assetstream/          Django settings & config
├── frontend/                 Next.js App
│   └── src/
│       ├── app/              Pages (App Router)
│       ├── components/       Reusable UI components
│       ├── hooks/            TanStack Query hooks
│       └── lib/              Utilities, axios client, theme
├── nginx/                    Reverse proxy config
├── docker-compose.yml        Local development stack
└── render.yaml               Render deployment blueprint
```

---

## Dashboard Pages

| Page | Description |
|---|---|
| `/dashboard` | KPI overview, revenue charts, fleet summary |
| `/dashboard/assets` | Full asset inventory with filter & search |
| `/dashboard/assets/[id]` | Asset detail — telemetry, AI valuation, lease history |
| `/dashboard/leases` | Lease contract management |
| `/dashboard/invoices` | Invoice management with mark-paid |
| `/dashboard/billing` | Billing volume charts & revenue forecast |
| `/dashboard/insights` | AI depreciation, risk scores, remarket candidates |
| `/dashboard/ai/*` | Aria AI chat, risk scores, maintenance predictions |
| `/dashboard/payments` | Payment records & gateway tracking |
| `/dashboard/tickets` | Service tickets |
| `/dashboard/audit` | Full audit log |

---

## Production Deployment (Render)

1. Push repo to GitHub
2. Go to [render.com](https://render.com) → **New → Blueprint**
3. Connect your repo — Render auto-detects `render.yaml`
4. Click **Apply** to deploy all services
5. Once live, open the API shell and run:
   ```bash
   python manage.py seed_demo_data
   ```

**Live URLs (after deploy):**
- Frontend: `https://assetstream-frontend.onrender.com`
- API: `https://assetstream-api.onrender.com/api/`

---

## Key Features

- **Live AI Chat (Aria)** — Groq-powered portfolio analyst with real-time DB context
- **IoT Telemetry** — Simulated usage logs, engine temp, fuel levels per asset
- **Risk Scoring** — ML-based lease risk classification (low → critical)
- **Maintenance Predictions** — Predictive failure detection with urgency scoring
- **Remarketing Engine** — AI valuation with sell/re-lease/refurbish recommendations
- **Billing Automation** — Monthly invoice generation with dunning rules
- **Audit Trail** — Full 3-year audit log across all entities
