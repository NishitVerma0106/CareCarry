# CareCarry 🏥

> **A secure, full-stack digital health record platform that gives patients a persistent CareCarry ID and QR-based identity, enables authorized hospitals to identify patients and manage medical documents, and provides doctors with the clinical information required to record consultations, diagnoses, and prescriptions.**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8+
- A Cloudinary account

### 1. Database Setup
```bash
# Create DB and run schema
mysql -u root -p < database/schema.sql

# (Optional) Load demo seed data
mysql -u root -p carecarry_db < database/seed.sql
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL and Cloudinary credentials
npm install
npm run dev      # Runs on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Runs on http://localhost:5173
```

---

## 🔑 Demo Credentials (after seed.sql)

| Role           | Email                    | Password       |
|----------------|--------------------------|----------------|
| Patient        | rajan@example.com        | Patient@1234   |
| Doctor         | dr.sharma@example.com    | Doctor@1234    |
| Hospital Staff | anil.staff@abc.in        | Staff@1234     |
| Admin          | admin@carecarry.in       | Admin@1234     |

---

## 🏗️ Architecture

```
Patient → CareCarry ID → QR Code
                ↓
Hospital Staff scans QR → Patient Identified → Encounter Created
                ↓
Doctor assigned → Views Clinical Summary → Records Consultation → Diagnosis → Prescription
                ↓
Hospital Staff uploads Lab Reports → Cloudinary (files) + MySQL (metadata)
                ↓
Patient logs in → Views complete Medical Timeline
```

---

## 📁 Project Structure

```
CareCarry/
├── backend/              # Node.js + Express REST API
│   ├── src/
│   │   ├── config/       # DB + Cloudinary config
│   │   ├── controllers/  # Business logic per role
│   │   ├── middleware/   # Auth, RBAC, audit, upload
│   │   ├── routes/       # Express routers
│   │   ├── services/     # Shared services
│   │   └── utils/        # CareCarry ID + QR generators
│   └── server.js
├── frontend/             # React + Vite SPA
│   └── src/
│       ├── pages/        # auth/ patient/ doctor/ hospital/ admin/
│       ├── components/   # Sidebar, Topbar
│       ├── context/      # AuthContext
│       ├── services/     # Axios API wrappers
│       └── routes/       # Protected route guards
├── database/
│   ├── schema.sql        # 16-table MySQL schema
│   └── seed.sql          # Demo data
└── README.md
```

---

## 🔒 Security Model

- **bcrypt** password hashing (salt rounds: 12)
- **JWT** authentication (7d expiry, httpOnly cookie + header)
- **RBAC** middleware — each endpoint requires specific role
- **Doctor verification** — doctors cannot access clinical endpoints until admin verifies them
- **Audit logging** — every sensitive action (read + write) is logged with actor, action, patient, timestamp
- **Cloudinary authenticated access** — medical files stored with private access mode
- **Rate limiting** — 200 req/15min global, 20 req/15min on auth endpoints

---

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Base identity for all roles |
| `patients` | CareCarry ID, profile, allergies |
| `qr_tokens` | Short-lived QR lookup tokens |
| `hospitals` | Hospital registry |
| `doctors` | License, specialization, verification |
| `hospital_staff` | Staff linked to hospital |
| `encounters` | Each hospital visit |
| `consultations` | Doctor's clinical notes per encounter |
| `diagnoses` | Linked to consultation |
| `prescriptions` | Linked to consultation |
| `prescription_items` | Individual medicines |
| `medical_reports` | Cloudinary file metadata |
| `access_grants` | Consent records |
| `audit_logs` | Every sensitive action |
| `notifications` | User notifications |
| `issue_reports` | Platform issue tracker |

---

## 📡 API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/patients/me
PUT    /api/patients/me
GET    /api/patients/me/carecarry-id
GET    /api/patients/me/timeline
GET    /api/patients/me/access-history

POST   /api/identity/resolve

GET    /api/doctors/me/queue
GET    /api/doctors/patients/:id/summary
POST   /api/doctors/consultations
PUT    /api/doctors/consultations/:id
POST   /api/doctors/diagnoses
POST   /api/doctors/prescriptions

POST   /api/hospitals/patients/lookup
POST   /api/hospitals/encounters
GET    /api/hospitals/encounters
GET    /api/hospitals/encounters/:id
POST   /api/hospitals/reports

GET    /api/admin/doctors/pending
PATCH  /api/admin/doctors/:id/verify
PATCH  /api/admin/doctors/:id/suspend
GET    /api/admin/hospitals/pending
PATCH  /api/admin/hospitals/:id/verify
GET    /api/admin/users
PATCH  /api/admin/users/:id/toggle-active
GET    /api/admin/audit-logs
GET    /api/admin/statistics
```

---

## 🧪 Test Scenario

1. Register as **Patient** → receive `CC-XXXXXXXX`
2. Login as **Patient** → view CareCarry ID + QR code
3. Login as **Hospital Staff** → enter CareCarry ID → identify patient → create encounter
4. Login as **Doctor** (must be admin-verified) → see today's queue → view clinical summary → record consultation + diagnosis + prescription
5. Login as **Hospital Staff** → upload lab report to encounter
6. Login as **Patient** → view complete Medical Timeline
7. Login as **Admin** → verify doctor → view audit logs

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Styling | Vanilla CSS (Custom Design System) |
| Backend | Node.js + Express |
| Database | MySQL 8 |
| Auth | JWT + bcrypt |
| File Storage | Cloudinary |
| Authorization | RBAC Middleware |

---

## 📋 SDG Alignment

- **SDG 3** — Good Health and Well-Being: Continuity of care for mobile populations
- **SDG 9** — Industry, Innovation and Infrastructure: Digital health infrastructure
- **SDG 10** — Reduced Inequalities: Healthcare access for migrant workers
