# BeltTrack - Martial Arts School Management & Rank Progression (Version 1)

A private, multi-tenant martial arts school management platform serving Dojo Administrators/Coaches and Students/Parents. The system operates as a closed, self-contained single source of truth—persisting internal records directly without external analytical engines, third-party feeds, or transaction cuts.

---

## 🥋 Core Architectural Pillars

1. **Strict Multi-Tenant Row-Level Security (RLS)**:
   - Each dojo operates in an isolated tenant scope (`school_id`).
   - Cross-tenant queries are blocked at the database engine level.
   - Global searches are restricted strictly to verified public school directories (name, slug, city, discipline).
   - All student rosters, attendances, technique checklists, and billing ledgers are strictly private records.

2. **Zero-Monetization Core**:
   - 100% free, no ads, no feature paywalls, no expiring trials, and no tiered subscriptions.
   - Internal ledger tracks off-platform settlements (cash, bank transfer, manual card) with system-generated receipt slugs (`REC-2026-BJJ-084`).

3. **100% Token-Compliant Design System**:
   - Zero hardcoded colors, zero raw pixel margins.
   - All visual styles inherit from [`tokens-complete.json`](./tokens-complete.json), compiled into [`variables.css`](./variables.css) and [`typography.css`](./typography.css).
   - Tailwind CSS is configured exclusively with design tokens as CSS variables.

---

## 🎨 Design System Token Mapping

All visual properties are bound strictly to design tokens exported in [`tokens-complete.json`](./tokens-complete.json):

| Design Token Category | Figma Token Source | CSS Custom Property |
| :--- | :--- | :--- |
| **Primary Brand Navy** | `primitives 2.keycolours_2.primarykeycolour_2` | `var(--color-primary)` (`#1b2a4a`) |
| **Accent Electric Blue** | `primitives 2.keycolours_2.tertiarykeycolour_2` | `var(--color-tertiary)` (`#2563eb`) |
| **Secondary Slate** | `primitives 2.keycolours_2.secondarykeycolour_2` | `var(--color-secondary)` (`#2d3748`) |
| **Surface Background** | `colour roles.surface` | `var(--color-surface)` (`#f4f3fb`) |
| **Surface Container** | `colour roles.surface container lowest` | `var(--color-surface-container-lowest)` (`#ffffff`) |
| **Inverse Dark Surface** | `colour roles.inverse surface` | `var(--color-inverse-surface)` (`#202227`) |
| **Soft Drop Shadow 2** | `effect.soft shadow 2` | `var(--shadow-soft-shadow-2)` |
| **Medium Elevation 2** | `effect.medium shadow 2` | `var(--shadow-medium-shadow-2)` |
| **Hard Elevation 2** | `effect.hard shadow 2` | `var(--shadow-hard-shadow-2)` |
| **Display Font** | `typography.display large` | `var(--font-family-barlow-semi-condensed)` |
| **Headline & Title Font** | `typography.headline large` / `title large` | `var(--font-family-outfit)` |
| **Body Font** | `typography.body large` | `var(--font-family-inter)` |
| **Telemetry & Code Font** | `typography.label large` | `var(--font-family-jetbrains-mono)` |

---

## 📁 Project Architecture & File Structure

```
BELTTRACK APP/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Next.js RootLayout with providers & typography tokens
│   │   └── page.tsx                  # Home screen with navigation, role entries, & preview
│   ├── components/
│   │   ├── home/
│   │   │   ├── hero-section.tsx      # Core pillars & architectural overview
│   │   │   ├── preview-dashboard.tsx # Rank engine, roll-call mat, & ledger cards
│   │   │   └── role-entry-cards.tsx  # Dojo Owner register vs Student code join
│   │   └── layout/
│   │       └── top-nav.tsx           # Navigation with tenant indicator & role switcher
│   ├── context/
│   │   ├── auth-context.tsx          # Persona state (Owner / Coach / Student)
│   │   └── tenant-context.tsx        # Isolated Dojo tenant context (school_id scope)
│   ├── lib/
│   │   ├── prisma.ts                 # Next.js-safe singleton Prisma Client instance
│   │   ├── prisma-extension.ts       # Multi-tenant Prisma query extension (school_id scope)
│   │   └── validation/
│   │       └── schemas.ts            # Zod schemas for registration, join codes, & ledger
│   ├── styles/
│   │   ├── globals.css               # Next.js App Router Tailwind styles
│   │   └── tokens.css                # Centralized token import layer
│   └── types/
│       └── domain.ts                 # TypeScript domain models (School, Member, Rank, Technique)
├── prisma/
│   ├── schema.prisma                 # PostgreSQL multi-tenant schema with school_id bindings
│   └── rls_policies.sql              # Database-level Row-Level Security isolation policies
├── docs/
│   └── product_requirement_document_prd_belttrack_v1.md # Approved Product Requirement Document
├── .env.example                      # Template for PostgreSQL connection configuration
├── index.html                        # Semantic, responsive standalone home screen
├── index.css                         # 100% token-powered martial arts stylesheet
├── app.js                            # Interactive state controller (modals, grading simulation)
├── tokens-complete.json              # Central Figma design tokens
├── build-tokens.js                   # Token compiler to CSS custom properties
├── variables.css                     # Generated CSS custom properties
├── typography.css                    # Typography scale utility classes
├── tailwind.config.ts                # Tailwind theme mapping tokens to CSS variables
├── postcss.config.mjs                # PostCSS configuration
├── tsconfig.json                     # Strict TypeScript configuration
├── package.json                      # Next.js, React, Tailwind, Prisma, and Zod dependencies
├── audit.js                          # Automated recursive token compliance audit
└── server.js                         # Local test server (Port 3000)
```

---

## ⚡ Workflows Previewed in Version 1

* **Curriculum & Rank Engine**:
  - Live martial arts belt visualization (White belt with stripes $\to$ Blue belt).
  - Class attendance count (42/50), time-in-rank (142/120 days), and technique checklist (8/10 verified).
  - Interactive "+ Simulate Roll-Call Check-in" button dynamically triggers the **"GRADING ELIGIBLE"** milestone.

* **Attendance & Drop-Off Alert Engine**:
  - Roll-call schedule tracking (Fundamentals, Competition Sparring).
  - Inactive student risk trigger flagging members absent for 10–14 consecutive days.

* **Internal Bookkeeping Ledger**:
  - Manual cash/transfer settlement entries with receipt slugs (`REC-2026-BJJ-084`).
  - Closed single source of truth with 0% platform cuts.

* **Role-Based Onboarding Entry Points**:
  - **Dojo Owner / Head Coach**: "Register Your Martial Arts School" modal generating custom tenant registration codes.
  - **Student / Guardian**: "Join with School Registration Code" modal with minor enrollment toggle, conditional guardian fields, and strict tenant `school_id` isolation (`PENDING_APPROVAL` status).
  - **Public Directory**: Accredited school directory showing public metadata without exposing private rosters.

---

## 🗄️ Database & Prisma ORM Setup

The application is configured to connect to PostgreSQL via Prisma ORM:

1. **Environment File Configuration**:
   - Copy `.env.example` to `.env`:
     ```powershell
     cp .env.example .env
     ```
   - Update `DATABASE_URL` with your active PostgreSQL credentials:
     ```env
     DATABASE_URL="postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?schema=public"
     ```

2. **Client Generation & Tenant Isolation**:
   - Generate TypeScript client types from `prisma/schema.prisma`:
     ```powershell
     npm run db:generate
     ```
   - All tenant queries are protected via `src/lib/prisma-extension.ts` ensuring zero cross-tenant leakage.

---

## 🚀 Running & Auditing

```powershell
# 1. Run design system compliance audit (asserts 0 hardcoded colors)
npm run audit
# or: node audit.js

# 2. Re-compile design tokens (if tokens-complete.json changes)
npm run build:tokens
# or: node build-tokens.js

# 3. Generate Prisma client typings
npm run db:generate

# 4. Start Next.js development server
npm run dev

# 5. Alternatively, start local standalone server
npm run serve
# or: node server.js
```

Open **[http://localhost:3000/](http://localhost:3000/)** in your browser.
