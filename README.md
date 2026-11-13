# BeltTrack - Martial Arts School Management & Rank Progression (Version 2)

A private, multi-tenant martial arts school management platform serving Dojo Administrators, Coaches, Students, and Guardians. BeltTrack acts as a self-contained single source of truth for curriculum progress, belt ranking eligibility, attendance roll-call, and internal tuition records—with strict tenant isolation, zero monetization, and a token-compliant design system.

---

## 🚀 Summary of Completed Transition (V1 to V2)

BeltTrack has evolved from an interactive MVP preview (**V1**) into a fully authenticated production release (**V2**) backed by **Supabase Auth** and Next.js 16+ App Router server-side cookie sessions:

| Phase | Milestone | Deliverables & Scope | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Supabase SSR & Client Infrastructure** | • Browser client via `@supabase/ssr` (`src/lib/supabase/client.ts`)<br>• Server client with async Next.js cookie handling (`src/lib/supabase/server.ts`)<br>• Service-role admin client (`src/lib/supabase/admin.ts`)<br>• Session refresh proxy middleware (`src/middleware.ts`) | **Complete & Verified** |
| **Phase 2** | **User Identity Linking & Schema Alignment** | • Added `supabase_uid String? @unique` to `prisma/schema.prisma`<br>• Made `hashedPassword` optional to decouple local auth from Supabase credentials<br>• Updated TypeScript domain models (`src/types/domain.ts`)<br>• Added `loginSchema` with runtime validations in `src/lib/validation/schemas.ts` | **Complete & Verified** |
| **Phase 3** | **Authentication API & Route Handlers** | • `POST /api/auth/login`: Signs in via Supabase Auth and binds to PostgreSQL `school_id`<br>• `POST /api/auth/logout`: Clears session tokens and HTTP-only cookies<br>• `GET /api/auth/callback`: Handles PKCE code exchanges<br>• `GET /api/auth/me`: Resolves active session and tenant mapping | **Complete & Verified** |
| **Phase 4** | **Client Auth State & Context Synchronization** | • `src/context/auth-context.tsx`: Subscribed to `onAuthStateChange` & `/api/auth/me`<br>• Added asynchronous `login(email, password)` and `logout()` handlers<br>• Preserved fallback demo persona preview mode for unauthenticated users<br>• Updated `src/components/layout/top-nav.tsx` with live session indicator & Sign In/Out | **Complete & Verified** |
| **Phase 5** | **Production-Ready Login Modal & UI Parity** | • Dedicated `LoginModal` component (`src/components/home/login-modal.tsx`) with real-time error feedback<br>• Connected login modal in Next.js home page (`src/app/page.tsx`)<br>• Parity reflected in standalone interactive preview (`index.html`, `index.css`, `app.js`) | **Complete & Verified** |

---

## 🗺️ Recommended Multi-Account Architecture & Implementation Roadmap

BeltTrack is designed for martial arts academies where participants frequently hold multiple active personas—such as a **Head Coach** who trains as a student under an affiliated master, an **Instructor** teaching across multiple academies, or a **Parent / Guardian** training in adult BJJ while managing their child's youth Judo attendance.

Under standard web browser security ([RFC 6265](https://datatracker.ietf.org/doc/html/rfc6265)), browser cookie storage is scoped per origin (`domain:port`), meaning concurrent logins for different accounts on the same origin overwrite each other. BeltTrack resolves this via the **Unified Identity & Multi-Membership Architecture** combined with **Tenant Subdomain Scoping**.

### 1. Architectural Model Overview

```text
                      [ User Identity: coach@kaizenbjj.org ]
                               (1 Supabase Auth Session)
                                          │
          ┌───────────────────────────────┼───────────────────────────────┐
          ▼                               ▼                               ▼
  [ Membership 1 ]                [ Membership 2 ]                [ Membership 3 ]
   School: Kaizen BJJ              School: LEMS Judo               School: Kaizen BJJ
   Role: OWNER / COACH             Role: STUDENT (Adult)           Role: GUARDIAN
   Status: ACTIVE                  Status: ACTIVE                  Status: LINKED (Minor)
          │                               │                               │
          └───────────────────────┬───────┴───────────────────────────────┘
                                  ▼
                  [ Top Navigation Dojo Switcher ]
                  Cookie: `belttrack_active_school_id`
```

### 2. The 4 Architectural Pillars

1. **Pillar 1: Unified Identity & Multi-Membership Data Model**:
   - Decouples global authentication (`User` / `auth.users`) from academy enrollment (`SchoolMember`).
   - A single human maintains one email and password, eliminating multiple credentials or cookie collisions.
   - Enforces strict multi-tenant Row-Level Security: each private record, attendance entry, and immutable ledger row binds strictly to the active `school_id`.

2. **Pillar 2: Active Tenant Context in Next.js 14+ App Router**:
   - A secure cookie (`belttrack_active_school_id`) tracks the academy currently in view.
   - Next.js `middleware.ts` verifies that the authenticated user holds valid membership in the requested school before forwarding requests with an `x-school-id` header.
   - Preserves 100% compatibility with Server Components and SSR without client-side state drift.

3. **Pillar 3: Top Navigation Academy & Persona Switcher**:
   - Replaces static preview simulator toggles with a dynamic multi-membership dropdown.
   - Displays the user's active academy and role with 1-click switching, dependent profile management, and a "+ Join Another School" action.

4. **Pillar 4: Production Subdomain Scoping (`<school-slug>.belttrack.com`)**:
   - In production, academies are accessible via dedicated subdomains (e.g. `kaizen.belttrack.com`, `lems.belttrack.com`).
   - Host-only cookie scoping allows power users (e.g. affiliate coaches) to maintain simultaneous tabs for different academies in the same browser window without session interference.

---

### 3. Implementation Roadmap

| Phase | Milestone | Scope & Deliverables | Target |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Immediate QA Testing & Isolation** | • Support concurrent testing via isolated browser profiles (Chrome/Edge Profiles or Incognito windows)<br>• Maintain existing interactive role switcher in top navigation for client-side demo evaluation | **Current (Complete)** |
| **Phase 2** | **Multi-Membership Schema & Active Context** | • Introduce `SchoolMember` relation in `prisma/schema.prisma` decoupling `User` from single `schoolId`<br>• Implement `belttrack_active_school_id` signed cookie handling in `src/middleware.ts`<br>• Update `src/context/tenant-context.tsx` to read and synchronize active academy membership | **Sprint 1** |
| **Phase 3** | **Interactive Academy & Role Switcher UI** | • Upgrade `src/components/layout/top-nav.tsx` with dynamic tenant selection dropdown<br>• Add "+ Join School with Code" flow for existing accounts without re-registration<br>• Enforce strict cross-tenant RLS checks on active membership switches | **Sprint 2** |
| **Phase 4** | **Guardian & Dependent Multi-Persona Views** | • Connect `GuardianStudent` relation to active switcher for 1-click toggling between parent and child<br>• Restrict guardian view to read-only attendance, curriculum progress, and immutable receipts | **Sprint 3** |
| **Phase 5** | **Production Subdomain Tenant Routing** | • Configure wildcard DNS (`*.belttrack.com`)<br>• Extract academy slug from `request.headers.get('host')` in Next.js middleware<br>• Enforce host-only cookie policies for complete multi-tenant browser isolation | **Production Launch** |

> [!NOTE]
> For complete technical specifications and RFC 6265 browser cookie jar analysis, refer to [`docs/multi-tenant-session-architecture.pdf`](./docs/multi-tenant-session-architecture.pdf).

---

---

## 🛠️ Installation & Setup Guide (For Developers)

Follow these steps to set up and run BeltTrack locally for development:

### 1. Prerequisites
- **Node.js**: Version `18.x` or higher (`v20+` recommended)
- **Package Manager**: `npm` (bundled with Node.js)
- **Database**: A PostgreSQL database (e.g. Supabase instance)
- **Supabase Project**: Free tier or self-hosted Supabase project with Authentication enabled (Email/Password provider)

### 2. Clone the Repository
```bash
git clone https://github.com/teck-zilla/Belttrack.git
cd Belttrack
git checkout second-branch
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```
Fill in the credentials in `.env`:
```env
# ==============================================================================
# 1. POSTGRESQL & PRISMA ORM (SUPABASE)
# ==============================================================================
# Transaction pooler URL (Port 6543, pgbouncer=true) for runtime queries
DATABASE_URL="postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct session URL (Port 5432) for Prisma DDL migrations and introspection
DIRECT_URL="postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"

# ==============================================================================
# 2. SUPABASE AUTH & SSR (NEXT_PUBLIC + SERVICE ROLE)
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
```

### 5. Initialize Database & Apply Row-Level Security (RLS)
Generate the Prisma Client TypeScript typings:
```bash
npm run db:generate
```

Deploy the version-controlled multi-tenant schema migrations (12 tenant-isolated tables with `school_id` foreign keys and 5 domain enums):
```bash
npm run db:migrate
```
*(Or for rapid prototyping: `npm run db:push`)*

Apply the PostgreSQL Row-Level Security policies to enforce tenant isolation and ledger privacy:
```bash
# Execute prisma/rls_policies.sql against your PostgreSQL / Supabase database
# via the Supabase Dashboard SQL Editor or psql:
psql "$DIRECT_URL" -f prisma/rls_policies.sql
```

### 6. Verify Design Token Compliance
Run the automated test runner to ensure 100% design token compliance with zero hardcoded styling:
```bash
npm run audit
```

### 7. Run the Application
**Option A: Next.js App Router (Full Stack Application)**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

**Option B: Standalone Interactive Preview (Static HTML/CSS/JS)**
```bash
npm run serve
```
Open [http://localhost:3000](http://localhost:3000) (serves `index.html` via `server.js`).

---

## 🥋 Core Architectural Pillars

1. **Strict Multi-Tenant Row-Level Security (RLS)**:
   - Every private record is explicitly bound to `school_id`.
   - Cross-tenant queries are blocked at the database engine level.
   - Public directory exposes only accredited name, slug, city, and discipline without leaking rosters or financials.
   - Users entering a join code receive `PENDING_APPROVAL` status, blocking read access to rosters and techniques until coach sign-off.

2. **Zero-Monetization Core**:
   - 100% free, zero ads, zero feature paywalls, zero tiered subscriptions.
   - Internal bookkeeping ledger tracks manual cash, bank transfer, and card receipts with immutable receipt slugs (`REC-[YEAR]-[DISCIPLINE]-[INCREMENT]`).
   - Accounting corrections must be offsetting reversal entries with reference slugs.

3. **100% Token-Compliant Design System**:
   - Zero hardcoded colors, zero raw pixel margins.
   - All visual styles inherit from [`tokens-complete.json`](./tokens-complete.json), compiled into [`variables.css`](./variables.css) and [`typography.css`](./typography.css) via `build-tokens.js`.
   - Tailwind CSS maps utility classes directly to CSS variables.

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
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts    # Supabase password auth & PostgreSQL tenant resolution
│   │   │   │   ├── logout/route.ts   # Session revocation & cookie cleanup
│   │   │   │   ├── callback/route.ts # PKCE code exchange handler
│   │   │   │   └── me/route.ts       # Active session introspection & tenant mapping
│   │   │   ├── schools/
│   │   │   │   ├── register/route.ts # Tenant school creation & Owner User persistence
│   │   │   │   └── directory/route.ts# Public accredited school discovery
│   │   │   └── students/
│   │   │       └── join/route.ts     # Join code validation & PENDING_APPROVAL enrollment
│   │   ├── layout.tsx                # Next.js RootLayout with Auth & Tenant providers
│   │   └── page.tsx                  # Home screen with navigation, role entries, modals, & preview
│   ├── components/
│   │   ├── home/
│   │   │   ├── hero-section.tsx      # Core pillars & architectural overview
│   │   │   ├── preview-dashboard.tsx # Rank engine, roll-call mat, & ledger cards
│   │   │   ├── role-entry-cards.tsx  # Dojo Owner register vs Student code join
│   │   │   └── login-modal.tsx       # Dedicated Supabase authentication modal
│   │   └── layout/
│   │       └── top-nav.tsx           # Navigation with live session badge, Sign In/Out, & role switcher
│   ├── context/
│   │   ├── auth-context.tsx          # Supabase auth listener, tenant sync, & persona switcher
│   │   └── tenant-context.tsx        # Isolated Dojo tenant context (school_id scope)
│   ├── lib/
│   │   ├── prisma.ts                 # Next.js-safe singleton Prisma Client instance
│   │   ├── prisma-extension.ts       # Multi-tenant Prisma query extension (school_id scope)
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser-side Supabase client (@supabase/ssr)
│   │   │   ├── server.ts             # Server-side Supabase client with async cookies (@supabase/ssr)
│   │   │   └── admin.ts              # Service-role admin client (@supabase/supabase-js)
│   │   └── validation/
│   │       └── schemas.ts            # Zod validation schemas for forms, login, & ledger
│   ├── middleware.ts                 # Supabase session refresh proxy middleware
│   ├── styles/
│   │   ├── globals.css               # Next.js App Router Tailwind styles
│   │   └── tokens.css                # Centralized token import layer
│   └── types/
│       └── domain.ts                 # TypeScript domain models (UserRecord, Member, Rank, Technique)
├── prisma/
│   ├── schema.prisma                 # PostgreSQL multi-tenant schema with supabase_uid & school_id
│   └── rls_policies.sql              # Database-level Row-Level Security isolation policies
├── docs/
│   └── product_requirement_document_prd_belttrack_v1.md # Approved Product Requirement Document
├── .env.example                      # Clean configuration template for database and Supabase keys
├── index.html                        # Semantic, responsive standalone preview home screen
├── index.css                         # 100% token-powered martial arts stylesheet
├── app.js                            # Standalone preview interactive controller
├── tokens-complete.json              # Central Figma design tokens
├── build-tokens.js                   # Token compiler to CSS custom properties
├── variables.css                     # Generated CSS custom properties
├── typography.css                    # Typography scale utility classes
├── tailwind.config.ts                # Tailwind theme mapping tokens to CSS variables
├── postcss.config.mjs                # PostCSS configuration
├── tsconfig.json                     # Strict TypeScript configuration
├── package.json                      # Next.js, React, Tailwind, Prisma, Supabase, and Zod dependencies
├── audit.js                          # Automated recursive token compliance audit
└── server.js                         # Local preview test server (Port 3000)
```

---

## 📋 Form Fields & Validation Specifications

All forms enforce strict runtime validation through Zod schemas in [`src/lib/validation/schemas.ts`](./src/lib/validation/schemas.ts) and inline UX feedback:

### 1. Authentication Login Form (`loginSchema` / `LoginModal`)
- **Email Address**: Valid email formatting (`"enter a valid email address"`), `"empty field error"` on empty blur.
- **Password**: Minimum 6 characters, `"empty field error"` on empty blur.

### 2. Dojo School Tenant Registration Form (`schoolRegistrationSchema`)
- **School / Academy Name**: Above 3 characters (length > 3, max 80), `"structure error"` if length <= 3.
- **Discipline**: Dropdown enum (`brazilian_jiu_jitsu`, `judo`, `karate`, `taekwondo`, `muay_thai`, `krav_maga`).
- **Head Coach / Owner Full Name**: At least 3 characters and at least 2 words separated by spaces, `"structure error"` if invalid.
- **Owner Email**: Valid email format (`"enter a valid email address"`).
- **City & Country**: City min 2 chars; Country length >= 2 (`"structure error"` if < 2).
- **School Join Code**: Optional custom 4-16 alphanumeric uppercase string.

### 3. Member & Guardian Join Code Form (`studentJoinCodeSchema`)
- **School Join Code**: 4-16 alphanumeric characters matching an active dojo join code.
- **Student Full Name**: Min 3 characters, at least 2 words separated by spaces (`"structure error"` if invalid).
- **Student Email**: Valid email format (`"enter a valid email address"`).
- **Minor Checkbox & Guardian Fields**: When minor is checked, Guardian Full Name (min 3 chars, 2+ words) is mandatory.

---

## 🧪 Quality Assurance & Scripts

```powershell
# 1. Run design system compliance audit (asserts 0 hardcoded colors across all files)
npm run audit

# 2. Run TypeScript strict type-check
npm run type-check

# 3. Build Next.js production bundle
npm run build

# 4. Re-compile design tokens (if tokens-complete.json changes)
npm run build:tokens
```
