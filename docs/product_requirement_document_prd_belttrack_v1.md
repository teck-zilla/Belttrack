# Product Requirement Document (PRD)

**Project Name:** BeltTrack (Martial Arts School Management & Rank Progression)  
**Version:** 1.0 (Foundational Architecture, Interactive Preview & Scaffolding)  
**Status:** Approved for Build (README & Token System Aligned)  
**Document Owner:** Product & Engineering Core Team  

---

## 1. Executive Summary & Core Architectural Pillars

### 1.1 Executive Summary
BeltTrack is a private, lightweight, multi-tenant martial arts school management platform serving Dojo Administrators/Coaches and Students/Parents. The system operates as a closed, self-contained single source of truth for student curriculum progress, belt ranking eligibility, class attendance, and internal tuition records.

### 1.2 Core Architectural Pillars
* **Strict Multi-Tenant Row-Level Security (RLS):** Every dojo operates in an isolated tenant scope (`school_id`). Cross-tenant queries are blocked at the database engine level (PostgreSQL RLS) alongside application-level scoping. Global searches are restricted strictly to verified public school directories (name, slug, city, discipline). All student rosters, attendances, technique checklists, and billing ledgers are strictly private records.
* **Zero-Monetization Core:** 100% free, no ads, no feature paywalls, no expiring trials, and no tiered subscriptions. Internal ledger records off-platform settlements (cash, bank transfer, manual card) with system-generated receipt slugs (`REC-[YEAR]-[DISCIPLINE]-[INCREMENT]`, e.g., `REC-2026-BJJ-084`).
* **100% Token-Compliant Design System:** Zero hardcoded colors, zero raw pixel margins. All visual styles inherit strictly from `tokens-complete.json`, compiled into `variables.css` and `typography.css` via `build-tokens.js`. Tailwind CSS maps exclusively to these design tokens as CSS variables. Automated compliance is enforced via `audit.js` (`npm run audit`).

---

## 2. Personas & Access Control (RBAC)

| Role | Scope | Permissions & Key Responsibilities |
| :--- | :--- | :--- |
| **Dojo Owner / Head Coach** | Single Tenant (`school_id`) | Registers school; generates, rotates, and revokes custom registration codes; approves pending student/parent enrollments; sets curriculum and belt ladders; logs manual payments; monitors drop-off alerts. |
| **Coach / Instructor** | Single Tenant (`school_id`) | Takes class attendance; verifies student techniques in real time; views student grading eligibility; cannot backdate records or alter past payments without Admin approval. |
| **Student (Adult 18+)** | Single Tenant (`school_id`) | Enrolls via school code; requires Admin approval before accessing private rosters; views personal belt track, attendance records, verified techniques, and internal payment receipts. |
| **Guardian / Parent** | Single Tenant (`school_id`) | Holds primary authentication account; creates and manages linked dependent sub-profiles for minors; views progress, attendance, and receipts for linked dependents only. |

---

## 3. Scope Boundaries: Version 1 Scaffolding & Interactive Preview

### 3.1 In Scope for Version 1
1. **Core Scaffolding & Dual-Target Architecture:**
   * Full Next.js 14+ App Router project structure with strict TypeScript.
   * Standalone static interactive preview files (`index.html`, `index.css`, `app.js`, `server.js`).
2. **Centralized Token Engine & Auditing:**
   * Token pipeline: `tokens-complete.json` $\to$ `build-tokens.js` $\to$ `variables.css` + `typography.css`.
   * Strict token auditing runner: `audit.js` (`npm run audit`) asserting zero raw hex values and zero arbitrary inline styles.
   * Custom `tailwind.config.ts` mapping Tailwind classes directly to README CSS variables.
3. **Database Architecture & Multi-Tenancy:**
   * PostgreSQL schema using Prisma ORM with explicit `school_id` foreign key relations.
   * Native database-level Row-Level Security (RLS) policies alongside Prisma query extensions.
4. **Context & State Architecture:**
   * `auth-context.tsx` managing Persona state (Owner, Coach, Student/Guardian).
   * `tenant-context.tsx` enforcing `school_id` tenant scoping.
5. **Interactive Home Interface & Workflows Previewed:**
   * **Top Nav (`top-nav.tsx`):** Responsive navigation with tenant indicator and interactive role switcher.
   * **Hero Section (`hero-section.tsx`):** Core pillars and architectural overview.
   * **Role-Based Onboarding Entry Modals (`role-entry-cards.tsx`):**
     * "Register Your Martial Arts School" modal (generates custom tenant registration codes).
     * "Join with School Registration Code" modal (with pending approval validation notice).
   * **Curriculum & Rank Engine Preview (`preview-dashboard.tsx`):**
     * Live martial arts belt progression visualization (White belt with stripes $\to$ Blue belt).
     * Visual metrics: Class attendance count (42/50), time-in-rank (142/120 days), and technique checklist (8/10 verified).
     * Interactive `"+ Simulate Roll-Call Check-in"` button that dynamically triggers the **"GRADING ELIGIBLE"** milestone status.
   * **Attendance & Drop-Off Alert Preview:** Roll-call schedule display and inactive student risk indicator (absent 10–14 days).
   * **Internal Bookkeeping Ledger Preview:** Manual payment transaction ledger preview rendering immutable receipt slugs.
   * **Public Directory:** Accredited school discovery list displaying public metadata without exposing private rosters.

### 3.2 Out of Scope for Version 1 (Deferred to V1.1+)
* External payment gateway processing (Stripe, PayPal, Apple Pay).
* Outbound push notification dispatch, SMS, or third-party transactional email workers.
* Native camera barcode/QR scanner drivers.
* Native iOS/Android builds.

---

## 4. Functional Specifications & Domain Logic

### 4.1 Tenant Registration & Join Code Lifecycle
* **School Creation:** Dojo Owner inputs school name, discipline (BJJ, Karate, Judo, Taekwondo, Muay Thai), city, and timezone. System provisions school entity and generates an isolated `school_id`.
* **Registration Code Engine:**
  * System generates an alphanumeric code (e.g., `DOJO-8492` or discipline-specific format).
  * Owners can regenerate or deactivate codes at any time.
  * Entering an active join code assigns the new user to `school_id` under `PENDING_APPROVAL` status.
  * Users with `PENDING_APPROVAL` status cannot view private rosters or technique matrices until approved by the school administrator.

### 4.2 Multi-Tenant Data & Security Model
* **Tenant Isolation:** Every private record table enforces `school_id` foreign key binding.
* **Database RLS Policies:**
  $$\text{Query Access} = \text{Authenticated Session} \land (\text{Target } school\_id = \text{Session } school\_id)$$
* **Prisma Extension Safeguard:** Prisma Client queries enforce tenant injection automatically to eliminate accidental unconstrained queries.
* **Public Directory Model:** Exposes strictly public school directory fields (`name`, `discipline`, `city`, `slug`). Global discovery of members or minors is strictly blocked.

### 4.3 Curriculum, Grading, & Drop-Off Engine
1. **Rank Sequence:** Custom progression ladder per discipline ($R_1 \rightarrow R_2 \rightarrow \dots \rightarrow R_n$). Each rank specifies:
   * Minimum required classes attended ($C_{req}$).
   * Minimum active training days in rank ($D_{req}$).
   * Mandatory technique checklist ($T_1, T_2, \dots, T_k$).
2. **Grading Eligibility Calculation:**
   $$\text{Eligible} = (C_{completed} \ge C_{req}) \land (D_{active} \ge D_{req}) \land (\forall i \in \{1,\dots,k\}, \text{Technique}_i = \text{VERIFIED})$$
3. **Drop-Off Alert Trigger:**
   $$\Delta t_{\text{last attendance}} \ge 10 \text{ days} \implies \text{Trigger Inactivity Risk Flag}$$
   Surfaces an in-app alert on the Dojo Owner / Head Coach dashboard.

### 4.4 Internal Ledger & Records
* Manual entry bookkeeping for off-platform settlements (`CASH`, `BANK_TRANSFER`, `EXTERNAL_CARD`).
* Immutable append-only ledger entries; updates and deletes are blocked.
* System generates structured receipts using the official format:
  $$\text{Receipt Slug} = \text{REC-}[YEAR]\text{-}[DISCIPLINE]\text{-}[INCREMENT] \quad (\text{e.g., } \text{REC-2026-BJJ-084})$$
* Error correction is handled exclusively through offsetting reversal entries referencing the original receipt slug.

---

## 5. Design System Tokens & Styling Specifications

All styling is strictly governed by `tokens-complete.json` and compiled into CSS variables:

### 5.1 Token Definitions & Variable Mapping

| Design Token Category | Figma Token Source | CSS Custom Property | Raw Fallback (Internal Only) |
| :--- | :--- | :--- | :--- |
| **Primary Brand Navy** | `primitives 2.keycolours_2.primarykeycolour_2` | `var(--color-primary)` | `#1b2a4a` |
| **Accent Electric Blue** | `primitives 2.keycolours_2.tertiarykeycolour_2` | `var(--color-tertiary)` | `#2563eb` |
| **Secondary Slate** | `primitives 2.keycolours_2.secondarykeycolour_2` | `var(--color-secondary)` | `#2d3748` |
| **Surface Background** | `colour roles.surface` | `var(--color-surface)` | `#f4f3fb` |
| **Surface Container** | `colour roles.surface container lowest` | `var(--color-surface-container-lowest)` | `#ffffff` |
| **Inverse Dark Surface** | `colour roles.inverse surface` | `var(--color-inverse-surface)` | `#202227` |
| **Soft Drop Shadow 2** | `effect.soft shadow 2` | `var(--shadow-soft-shadow-2)` | Variable shadow matrix |
| **Medium Elevation 2** | `effect.medium shadow 2` | `var(--shadow-medium-shadow-2)` | Variable shadow matrix |
| **Hard Elevation 2** | `effect.hard shadow 2` | `var(--shadow-hard-shadow-2)` | Variable shadow matrix |
| **Display Font** | `typography.display large` | `var(--font-family-barlow-semi-condensed)` | `'Barlow Semi Condensed', sans-serif` |
| **Headline & Title Font** | `typography.headline large` / `title large` | `var(--font-family-outfit)` | `'Outfit', sans-serif` |
| **Body Font** | `typography.body large` | `var(--font-family-inter)` | `'Inter', sans-serif` |
| **Telemetry & Code Font** | `typography.label large` | `var(--font-family-jetbrains-mono)` | `'JetBrains Mono', monospace` |

### 5.2 Tailwind Configuration (`tailwind.config.ts`)
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        tertiary: "var(--color-tertiary)",
        secondary: "var(--color-secondary)",
        surface: {
          DEFAULT: "var(--color-surface)",
          container: "var(--color-surface-container-lowest)",
          inverse: "var(--color-inverse-surface)",
        },
      },
      boxShadow: {
        "soft-2": "var(--shadow-soft-shadow-2)",
        "medium-2": "var(--shadow-medium-shadow-2)",
        "hard-2": "var(--shadow-hard-shadow-2)",
      },
      fontFamily: {
        display: ["var(--font-family-barlow-semi-condensed)", "sans-serif"],
        headline: ["var(--font-family-outfit)", "sans-serif"],
        body: ["var(--font-family-inter)", "sans-serif"],
        mono: ["var(--font-family-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 6. Prisma Database Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  OWNER
  COACH
  STUDENT
  GUARDIAN
}

enum MembershipStatus {
  PENDING_APPROVAL
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  MANUAL_CARD
}

enum TransactionType {
  TUITION
  TESTING_FEE
  UNIFORM_EQUIPMENT
  CORRECTION_REVERSAL
}

enum TechniqueStatus {
  NOT_STARTED
  IN_PROGRESS
  VERIFIED
}

model School {
  id           String        @id @default(uuid())
  name         String
  slug         String        @unique
  discipline   String
  city         String
  timezone     String        @default("UTC")
  joinCode     String        @unique
  isCodeActive Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  users        User[]
  rankTracks   RankTrack[]
  classes      ClassSchedule[]
  ledger       LedgerEntry[]
  alerts       InactivityAlert[]

  @@index([joinCode])
  @@index([slug, city])
}

model User {
  id               String            @id @default(uuid())
  schoolId         String            @map("school_id")
  email            String            @unique
  hashedPassword   String
  role             Role              @default(STUDENT)
  status           MembershipStatus  @default(PENDING_APPROVAL)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  school           School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  profile          StudentProfile?
  guardianLinks    GuardianStudent[] @relation("GuardianRelation")
  studentOf        GuardianStudent[] @relation("StudentRelation")

  @@index([schoolId, role])
  @@index([schoolId, status])
}

model StudentProfile {
  id                 String              @id @default(uuid())
  userId             String              @unique
  firstName          String
  lastName           String
  dateOfBirth        DateTime
  isMinor            Boolean             @default(false)
  currentRankId      String?
  lastPromotionDate  DateTime            @default(now())
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  user               User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  currentRank        Rank?               @relation(fields: [currentRankId], references: [id])
  attendances        Attendance[]
  techniqueProgress  TechniqueProgress[]
}

model GuardianStudent {
  id          String   @id @default(uuid())
  guardianId  String
  studentId   String
  isApproved  Boolean  @default(false)
  createdAt   DateTime @default(now())

  guardian    User     @relation("GuardianRelation", fields: [guardianId], references: [id], onDelete: Cascade)
  student     User     @relation("StudentRelation", fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([guardianId, studentId])
}

model RankTrack {
  id          String   @id @default(uuid())
  schoolId    String   @map("school_id")
  name        String
  ranks       Rank[]
  school      School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([schoolId])
}

model Rank {
  id                 String           @id @default(uuid())
  rankTrackId        String
  orderIndex         Int
  title              String
  beltColorHex       String
  requiredClasses    Int
  requiredActiveDays Int
  
  rankTrack          RankTrack        @relation(fields: [rankTrackId], references: [id], onDelete: Cascade)
  techniques         Technique[]
  profilesAtRank     StudentProfile[]

  @@unique([rankTrackId, orderIndex])
}

model Technique {
  id          String              @id @default(uuid())
  rankId      String
  name        String
  description String?

  rank        Rank                @relation(fields: [rankId], references: [id], onDelete: Cascade)
  progress    TechniqueProgress[]
}

model TechniqueProgress {
  id          String          @id @default(uuid())
  profileId   String
  techniqueId String
  status      TechniqueStatus @default(NOT_STARTED)
  verifiedAt  DateTime?
  verifiedBy  String?

  profile     StudentProfile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  technique   Technique       @relation(fields: [techniqueId], references: [id], onDelete: Cascade)

  @@unique([profileId, techniqueId])
}

model ClassSchedule {
  id          String       @id @default(uuid())
  schoolId    String       @map("school_id")
  title       String
  weekday     Int
  startTime   String
  endTime     String

  school      School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  attendances Attendance[]

  @@index([schoolId])
}

model Attendance {
  id             String         @id @default(uuid())
  idempotencyKey String         @unique
  profileId      String
  classId        String?
  attendedAt     DateTime       @default(now())

  profile        StudentProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  classSchedule  ClassSchedule? @relation(fields: [classId], references: [id], onDelete: SetNull)

  @@index([profileId, attendedAt])
}

model LedgerEntry {
  id               String          @id @default(uuid())
  schoolId         String          @map("school_id")
  userId           String
  receiptSlug      String          @unique
  amountCents      Int
  currency         String          @default("USD")
  paymentMethod    PaymentMethod
  transactionType  TransactionType
  reversalRefSlug  String?
  note             String?
  createdAt        DateTime        @default(now())

  school           School          @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([schoolId, userId])
  @@index([receiptSlug])
}

model InactivityAlert {
  id             String   @id @default(uuid())
  schoolId       String   @map("school_id")
  profileId      String
  daysInactive   Int
  isResolved     Boolean  @default(false)
  createdAt      DateTime @default(now())

  school         School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([schoolId, isResolved])
}
```

---

## 7. Project Architecture & File Tree Enforcement

All implementations must conform strictly to the defined project repository structure:

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
├── package.json                      # Next.js, React, Tailwind, and Zod dependencies
├── audit.js                          # Automated recursive token compliance audit
└── server.js                         # Local test server (Port 3000)
```

---

## 8. Version 1 Acceptance Criteria & Verification Gates

- [ ] **Token Integrity Check (`npm run audit`):**
  - `audit.js` runs recursively across all CSS, HTML, TSX, and JS files.
  - Zero hardcoded hex colors, zero raw rgb/hsl values, and zero undeclared arbitrary Tailwind values.
- [ ] **Token Compiler Pipeline (`npm run build:tokens`):**
  - `build-tokens.js` consumes `tokens-complete.json` and cleanly outputs `variables.css` and `typography.css`.
- [ ] **Dual Execution Verification:**
  - `npm run dev`: Next.js 14+ development server compiles cleanly on `http://localhost:3000/`.
  - `npm run serve`: Standalone server launches `index.html` on port 3000.
- [ ] **Interactive Preview Validation:**
  - Role switcher toggles persona views (Owner, Coach, Student).
  - "+ Simulate Roll-Call Check-in" increments attendance (42 $\to$ 43) and dynamically triggers the "GRADING ELIGIBLE" state when thresholds are met.
  - "Register School" and "Join with Code" modals open and validate inputs against Zod schemas.
- [ ] **Database & Multi-Tenancy Validation:**
  - Prisma schema compiles via `npx prisma validate`.
  - All foreign keys bind to `school_id`.
  - PostgreSQL Row-Level Security policies active on all tenant tables.