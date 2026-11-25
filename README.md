# BeltTrack - Martial Arts School Management & Rank Progression (Version 2)

A private, multi-tenant martial arts school management platform serving Dojo Administrators, Coaches, Students, and Guardians. BeltTrack acts as a self-contained single source of truth for curriculum progress, belt ranking eligibility, attendance roll-call, and internal tuition records—with strict tenant isolation, zero monetization, and a token-compliant design system.

---

## 🚀 Summary of Completed Transition (V1 to V2)

BeltTrack has evolved from an interactive MVP preview (**V1**) into a fully authenticated, multi-tenant production release (**V2**) backed by **Supabase Auth**, PostgreSQL via **Prisma ORM**, and Next.js 16+ App Router server-side cookie sessions:

| Phase | Milestone | Deliverables & Scope | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Supabase SSR & Client Infrastructure** | • Browser client via `@supabase/ssr` (`src/lib/supabase/client.ts`)<br>• Server client with async Next.js cookie handling (`src/lib/supabase/server.ts`)<br>• Service-role admin client (`src/lib/supabase/admin.ts`)<br>• Session refresh proxy with CSP & CSRF protection (`src/proxy.ts`) | **Complete & Verified** |
| **Phase 2** | **User Identity Linking & Schema Alignment** | • Added `supabase_uid String? @unique` to `prisma/schema.prisma`<br>• Made `hashedPassword` optional; decoupled local auth from Supabase credentials<br>• Updated TypeScript domain models (`src/types/domain.ts`)<br>• Added `loginSchema` with strict runtime validations in `src/lib/validation/schemas.ts` | **Complete & Verified** |
| **Phase 3** | **Authentication, Password Recovery & Email Verification** | • `POST /api/auth/login`: Signs in via Supabase Auth and binds to PostgreSQL `school_id`<br>• `POST /api/auth/logout`: Clears session tokens and HTTP-only cookies<br>• `GET /api/auth/callback`: Handles PKCE code exchanges with safe origin fallback<br>• `GET /api/auth/me`: Resolves active session and tenant mapping<br>• `POST /api/auth/reset-password`: In-modal 6-digit OTP reset flow with email/school join code lookup and password predictability checks<br>• `POST /api/auth/verify-email` & `POST /api/auth/resend-verification`: Transactional 6-digit code verification with 60s cooldown | **Complete & Verified** |
| **Phase 4** | **Client Auth State & Context Synchronization** | • `src/context/auth-context.tsx`: Subscribed to `onAuthStateChange` & `/api/auth/me`<br>• Added asynchronous `login(email, password)` and `logout()` handlers<br>• Preserved fallback demo persona preview mode for unauthenticated users<br>• Updated `src/components/layout/top-nav.tsx` with live session indicator & Sign In/Out | **Complete & Verified** |
| **Phase 5** | **Production Login Modal, In-Modal Recovery & Isolated QA Profiles** | • Dedicated `LoginModal` component (`src/components/home/login-modal.tsx`) with real-time feedback and in-modal password reset flow<br>• Automated browser profile launcher (`scripts/launch-browser-profiles.mjs`, `npm run profile:both`) enabling simultaneous multi-role testing without cookie collision<br>• Parity reflected in standalone interactive preview (`index.html`, `index.css`, `app.js`) | **Complete & Verified** |
| **Phase 6** | **Core Domain Persistence & Business Logic** | • `POST /api/attendance`: Staff-only roll-call check-in with idempotency keys and server timestamps (no backdating)<br>• `GET /api/techniques` & `POST /api/techniques/verify`: Staff-only technique sign-off persisting `TechniqueProgress`<br>• `POST /api/ledger`: Zero-monetization internal tuition ledger with immutable receipt slugs (`REC-[YEAR]-[DISCIPLINE]-[INCREMENT]`) and offsetting reversal entries<br>• `GET /api/dashboard`: Aggregated rank metrics, attendance roll-call stats, and inactive student risk detection (>=10 days absent)<br>• `POST /api/schools/join-code`: Owner-only join code rotation and revocation<br>• `GET / POST /api/schools/approvals`: Staff approval of pending students, automatically activating linked guardian accounts<br>• `GET /api/schools/directory`: Public directory exposing only accredited school name, slug, city, and discipline | **Complete & Verified** |
| **Phase 7** | **Account Deletion Lifecycle & GDPR Compliance** | • User self-service account deletion request (`POST /api/account/deletion`)<br>• School owner school deletion request (`POST /api/schools/deletion`)<br>• Staff deletion request review (`GET / POST /api/schools/deletion-requests`)<br>• Bearer-token protected automated purge endpoint (`POST /api/internal/deletions/purge`) executed by GitHub Actions cron (`.github/workflows/purge-deletions.yml`) | **Complete & Verified** |
| **Phase 8** | **Production Hardening, Audit Logging & Security Verification** | • Boot-time fail-closed environment validation (`src/lib/env-validation.ts`) ensuring all required secrets and URLs exist<br>• Upstash-backed rate limiting with Vercel-aware trusted proxy IP extraction (`src/lib/rate-limit.ts`)<br>• Strict same-origin CSRF enforcement and internal cron bearer exemption (`src/lib/csrf.ts`)<br>• Nonce-based per-request Content Security Policy and security headers in `src/proxy.ts`<br>• Tenant-scoped append-only `AuditLog` capturing ledger entries, approvals, deletions, and purges (`src/lib/audit-log.ts`)<br>• 32/32 unit and tenant-isolation regression test suite (`npm test`) | **Complete & Verified** |
| **Phase 9** | **Demo & Production Presentation Polish** | • React 19 + ESLint verification pipeline (`npm run lint`)<br>• Demo/Real tenant banner and hidden preview controls in live sessions<br>• Deterministic demo seed script (`npm run db:seed:demo`)<br>• Dashboard loading, empty, retry, and scrubbed error states<br>• Next.js metadata moved to `src/app/layout.tsx` | **Complete & Verified** |

---

## Current Verification Commands

```bash
npm run audit
npx tsc --noEmit --incremental false
npm run lint
npm test
npx next build
```

Playwright lifecycle coverage:

```bash
npx playwright install chromium
npm run test:e2e
```

The staff lifecycle e2e test requires `E2E_STAFF_STORAGE_STATE`, `E2E_PROFILE_ID`, and `E2E_TECHNIQUE_ID`; it skips automatically when these are absent.

For deployment sequencing and required runtime configuration, see [`docs/deployment-runbook.md`](./docs/deployment-runbook.md) and [`docs/environment-checklist.md`](./docs/environment-checklist.md).

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
   - Next.js `src/proxy.ts` verifies that the authenticated user holds valid membership in the requested school before forwarding requests with an `x-school-id` header.
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
| **Phase 2** | **Multi-Membership Schema & Active Context** | • Introduce `SchoolMember` relation in `prisma/schema.prisma` decoupling `User` from single `schoolId`<br>• Implement `belttrack_active_school_id` signed cookie handling in `src/proxy.ts`<br>• Update `src/context/tenant-context.tsx` to read and synchronize active academy membership | **Sprint 1** |
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

# ==============================================================================
# 3. PRODUCTION HARDENING
# ==============================================================================
UPSTASH_REDIS_REST_URL="https://<UPSTASH-ENDPOINT>"
UPSTASH_REDIS_REST_TOKEN="<UPSTASH-TOKEN>"
UPSTASH_RATE_LIMIT_PREFIX="belttrack:ratelimit"
TRUSTED_PROXY_HOPS="1"
TRUST_REAL_IP_HEADER="false"
TRUST_CLOUDFLARE_CONNECTING_IP="false"
RATE_LIMIT_FAIL_CLOSED="false"
DELETION_PURGE_SECRET="<LONG-RANDOM-SECRET>"
CRON_SECRET="<LONG-RANDOM-SECRET>"
```

### 5. Initialize Database & Apply Row-Level Security (RLS)
Generate the Prisma Client TypeScript typings:
```bash
npm run db:generate
```

Deploy the version-controlled multi-tenant schema migrations (13 tenant-isolated tables with `school_id` foreign keys and 5 domain enums):
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
│   │   │   │   ├── login/route.ts              # Supabase password auth & PostgreSQL tenant resolution
│   │   │   │   ├── logout/route.ts             # Session revocation & cookie cleanup
│   │   │   │   ├── callback/route.ts           # PKCE code exchange handler
│   │   │   │   ├── me/route.ts                 # Active session introspection & tenant mapping
│   │   │   │   ├── reset-password/route.ts     # In-modal 6-digit OTP password reset workflow
│   │   │   │   ├── verify-email/route.ts       # 6-digit email confirmation code verification
│   │   │   │   └── resend-verification/route.ts# Rate-limited OTP resend with 60s cooldown
│   │   │   ├── schools/
│   │   │   │   ├── register/route.ts           # Tenant school creation & Owner User persistence
│   │   │   │   ├── directory/route.ts          # Public accredited school discovery
│   │   │   │   ├── join-code/route.ts          # Owner-only join code rotation & revocation
│   │   │   │   ├── approvals/route.ts          # Staff-only pending student & guardian approvals
│   │   │   │   ├── deletion/route.ts           # School owner deletion request initiation
│   │   │   │   └── deletion-requests/route.ts  # Staff deletion request inspection
│   │   │   ├── students/
│   │   │   │   └── join/route.ts               # Join code validation & PENDING_APPROVAL enrollment
│   │   │   ├── attendance/route.ts             # Staff-only roll-call check-in with idempotency keys
│   │   │   ├── techniques/
│   │   │   │   ├── route.ts                    # Tenant technique curriculum catalog
│   │   │   │   └── verify/route.ts             # Staff-only technique sign-off persistence
│   │   │   ├── ledger/route.ts                 # Immutable zero-monetization tuition receipts & reversals
│   │   │   ├── dashboard/route.ts              # Role-aware metrics & inactive student risk alerts (>=10d)
│   │   │   ├── account/deletion/route.ts       # User self-service account deletion request
│   │   │   └── internal/deletions/purge/route.ts# Protected bearer-token scheduled deletion purge
│   │   ├── layout.tsx                          # Next.js RootLayout with Auth & Tenant providers
│   │   └── page.tsx                            # Home screen with navigation, role entries, modals, & dashboard
│   ├── components/
│   │   ├── home/
│   │   │   ├── hero-section.tsx                # Core pillars & architectural overview
│   │   │   ├── preview-dashboard.tsx           # Rank engine, roll-call mat, & ledger cards
│   │   │   ├── role-entry-cards.tsx            # Dojo Owner register vs Student code join
│   │   │   ├── login-modal.tsx                 # Dedicated Supabase authentication & OTP reset modal
│   │   │   ├── student-join-modal.tsx          # Alphanumeric join code redemption modal
│   │   │   ├── technique-curriculum-modal.tsx  # Interactive technique sign-off curriculum
│   │   │   ├── manual-ledger-modal.tsx         # Cash/transfer receipt & reversal ledger modal
│   │   │   ├── member-approval-modal.tsx       # Staff approval queue for pending members
│   │   │   ├── account-deletion-modal.tsx      # User deletion request modal
│   │   │   ├── deletion-requests-modal.tsx     # Staff school deletion request inspection modal
│   │   │   ├── email-verification-banner.tsx   # Unverified email warning banner
│   │   │   └── use-accessible-modal.ts         # Accessible modal focus trap & escape key handler
│   │   └── layout/
│   │       ├── dynamic-title.tsx               # Context-aware document title manager
│   │       └── top-nav.tsx                     # Navigation with live session badge, Sign In/Out, & switcher
│   ├── context/
│   │   ├── auth-context.tsx                    # Supabase auth listener, tenant sync, & persona switcher
│   │   └── tenant-context.tsx                  # Isolated Dojo tenant context (school_id scope)
│   ├── lib/
│   │   ├── prisma.ts                           # Next.js-safe singleton Prisma Client instance
│   │   ├── prisma-extension.ts                 # Multi-tenant Prisma query extension (school_id scope)
│   │   ├── auth-guard.ts                       # Server-side role & tenant fail-closed authorization
│   │   ├── audit-log.ts                        # Append-only tenant audit logger
│   │   ├── rate-limit.ts                       # Upstash Redis rate limiter with trusted proxy extraction
│   │   ├── csrf.ts                             # Strict same-origin CSRF validation
│   │   ├── email-verification.ts               # Cryptographic OTP generation & SMTP delivery service
│   │   ├── session-security.ts                 # HMAC-SHA256 session cookie signing & verification
│   │   ├── env-validation.ts                   # Boot-time fail-closed environment variable validator
│   │   ├── supabase/
│   │   │   ├── client.ts                       # Browser-side Supabase client (@supabase/ssr)
│   │   │   ├── server.ts                       # Server-side Supabase client with async cookies (@supabase/ssr)
│   │   │   └── admin.ts                        # Service-role admin client (@supabase/supabase-js)
│   │   └── validation/
│   │       ├── schemas.ts                      # Zod validation schemas for forms, login, & ledger
│   │       └── password.ts                     # Password strength & predictability checks
│   ├── proxy.ts                                # Supabase session refresh, CSP nonce & CSRF proxy
│   ├── styles/
│   │   ├── globals.css                         # Next.js App Router Tailwind styles
│   │   └── tokens.css                          # Centralized token import layer
│   └── types/
│       └── domain.ts                           # TypeScript domain models (UserRecord, Member, Rank, Technique)
├── prisma/
│   ├── schema.prisma                           # PostgreSQL multi-tenant schema with 14 models & 5 enums
│   ├── rls_policies.sql                        # Database-level Row-Level Security isolation policies
│   └── migrations/                             # Version-controlled schema migrations
├── scripts/
│   ├── launch-browser-profiles.mjs             # Chrome/Edge isolated profile launcher for multi-tenant QA
│   ├── seed-demo-data.mjs                      # Deterministic demo tenant seed script
│   └── build-tokens.js                         # Token compiler from Figma tokens to CSS properties
├── tests/
│   ├── e2e/lifecycle.spec.ts                   # Playwright end-to-end multi-role test suite
│   ├── schemas.test.mjs                        # Zod schema validation unit tests
│   ├── tenant-isolation.test.mjs               # Prisma & RLS tenant boundary static tests
│   ├── environment.test.mjs                    # Environment validation unit tests
│   ├── guardian-attendance.test.mjs            # Guardian links & attendance rules test
│   ├── fallback-safety.test.mjs                # Zero client-side fallback synthesis tests
│   ├── auth-redirect.test.mjs                  # Safe auth callback redirect unit tests
│   ├── deletion-audit.test.mjs                 # Deletion lifecycle audit logging tests
│   └── join-code.test.mjs                      # Join code rotation & revocation tests
├── docs/                                       # Architecture guides, runbooks & audit reports
├── .env.example                                # Clean configuration template for database and Supabase keys
├── index.html                                  # Semantic, responsive standalone preview home screen
├── index.css                                   # 100% token-powered martial arts stylesheet
├── app.js                                      # Standalone preview interactive controller
├── tokens-complete.json                        # Central Figma design tokens
├── variables.css                               # Generated CSS custom properties
├── typography.css                              # Typography scale utility classes
├── tailwind.config.ts                          # Tailwind theme mapping tokens to CSS variables
├── postcss.config.mjs                          # PostCSS configuration
├── tsconfig.json                               # Strict TypeScript configuration
├── package.json                                # Project dependencies, engines & test scripts
├── audit.js                                    # Automated recursive token compliance audit
└── server.js                                   # Local preview test server (Port 3000)
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
