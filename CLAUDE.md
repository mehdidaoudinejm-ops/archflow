# ArchFlow — Fichier de contexte Claude Code

> Ce fichier est lu automatiquement par Claude Code à chaque session.
> Ne jamais le supprimer. Le mettre à jour après chaque sprint terminé.

---

## 1. Vision du produit

**ArchFlow** est un SaaS destiné aux architectes d'intérieur et décorateurs.
Il digitalise la gestion de projet : consultation des entreprises (DPGF), suivi de chantier, communication client.

**Utilisateurs cibles** : cabinets d'architecture d'intérieur de 1 à 10 personnes (France).

**Problème résolu** : Les architectes gèrent aujourd'hui leurs DPGF sous Excel, envoient les plans par email, comparent les offres manuellement. ArchFlow centralise tout en une plateforme.

**Positionnement** : concurrent de Mesetys.tech — mais spécialisé sur la consultation des entreprises (DPGF) là où Mesetys se concentre sur la collaboration client.

---

## 2. Architecture — Shell modulaire

La plateforme est un **shell modulaire** : une coque centrale + des modules métier indépendants.

```
/app
  /(shell)          → auth, navigation, paramètres agence, notifications
  /(modules)
    /dpgf           → Module 01 — DPGF & Analyse des offres [ACTIF]
    /chantier       → Module 02 — Suivi de chantier [FUTUR]
    /facturation    → Module 03 — Facturation [FUTUR]
```

**Règle absolue** : les modules ne se parlent pas directement entre eux.
Toute communication passe par le shell (via les tables partagées `projects`, `users`, `agencies`).

---

## 3. Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js App Router | 14.x |
| Langage | TypeScript | 5.x |
| CSS | Tailwind CSS | 3.x |
| Base de données | PostgreSQL via Supabase | — |
| Auth | Supabase Auth | — |
| ORM | Prisma | 5.x |
| Storage fichiers | Supabase Storage | — |
| Emails | Resend + React Email | — |
| Paiements | Stripe | — |
| IA Import | Anthropic SDK (Claude claude-sonnet-4-6) | — |
| Déploiement | Vercel | — |
| UI components | shadcn/ui + Radix UI | — |
| Tableau DPGF | TanStack Table | — |
| Graphiques | Recharts | — |
| PDF | React-PDF | — |
| Queue jobs | Upstash QStash (serverless) | — |
| Validation | Zod | — |

---

## 4. Structure des dossiers

```
archflow/
├── CLAUDE.md                    ← CE FICHIER
├── SPRINTS.md                   ← Plan de sprints et état d'avancement
├── .env.local                   ← Variables d'environnement (jamais committé)
├── .env.example                 ← Template des variables (committé)
├── prisma/
│   ├── schema.prisma            ← Modèle de données complet
│   └── migrations/              ← Migrations auto-générées
├── supabase/
│   └── storage.sql              ← Politiques RLS Storage
├── src/
│   ├── app/
│   │   ├── (shell)/             ← Routes shell (auth, dashboard, settings)
│   │   │   ├── layout.tsx       ← Layout principal avec sidebar + topbar
│   │   │   ├── dashboard/
│   │   │   └── settings/
│   │   ├── (modules)/
│   │   │   └── dpgf/            ← Module DPGF
│   │   │       ├── [projectId]/
│   │   │       │   ├── page.tsx           ← Vue DPGF principale
│   │   │       │   ├── dce/page.tsx       ← Section documents DCE
│   │   │       │   ├── ao/page.tsx        ← Appel d'offre
│   │   │       │   ├── qa/page.tsx        ← Q&A
│   │   │       │   └── analyse/page.tsx   ← Dashboard analyse
│   │   ├── portal/              ← Portail entreprise (layout séparé)
│   │   │   └── [aoId]/
│   │   │       └── page.tsx
│   │   ├── client/              ← Espace client (layout séparé)
│   │   │   └── [projectId]/
│   │   │       └── page.tsx
│   │   └── api/                 ← Routes API
│   │       ├── dpgf/
│   │       ├── ao/
│   │       ├── portal/
│   │       ├── client/
│   │       └── ai-import/
│   ├── components/
│   │   ├── shell/               ← Topbar, Sidebar, Notifications
│   │   ├── dpgf/                ← Composants spécifiques DPGF
│   │   └── ui/                  ← shadcn/ui components (auto-générés)
│   ├── lib/
│   │   ├── prisma.ts            ← Client Prisma singleton
│   │   ├── supabase.ts          ← Client Supabase
│   │   ├── auth.ts              ← Helpers auth (getSession, requireRole)
│   │   ├── email.ts             ← Wrapper Resend
│   │   └── ai-import.ts        ← Logique import IA
│   ├── types/
│   │   └── index.ts             ← Types TypeScript partagés
│   └── middleware.ts            ← Protection routes par rôle
```

---

## 5. Modèle de données (Prisma Schema)

```prisma
// ── SHELL ─────────────────────────────────────────────

model Agency {
  id              String    @id @default(cuid())
  name            String
  logoUrl         String?
  plan            Plan      @default(SOLO)
  stripeCustomerId String?
  activeModules   String[]  @default(["dpgf"])
  createdAt       DateTime  @default(now())
  users           User[]
  projects        Project[]
  library         Library[]
}

model User {
  id           String    @id @default(cuid())
  agencyId     String?
  email        String    @unique
  role         Role
  firstName    String?
  lastName     String?
  avatarUrl    String?
  createdAt    DateTime  @default(now())
  agency       Agency?   @relation(fields:[agencyId], references:[id])
  permissions  ProjectPermission[]
  notifications Notification[]
  activityLogs  ActivityLog[]
}

model Project {
  id          String    @id @default(cuid())
  agencyId    String
  name        String
  address     String?
  clientUserId String?
  status      ProjectStatus @default(ACTIVE)
  createdAt   DateTime  @default(now())
  agency      Agency    @relation(fields:[agencyId], references:[id])
  dpgfs       DPGF[]
  permissions ProjectPermission[]
}

model ProjectPermission {
  id          String    @id @default(cuid())
  projectId   String
  userId      String
  module      String    // "dpgf", "chantier", etc.
  permissions Json      // { canEdit: bool, canSeeEstimate: bool, ... }
  project     Project   @relation(fields:[projectId], references:[id])
  user        User      @relation(fields:[userId], references:[id])
}

model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String
  title     String
  body      String?
  link      String?
  readAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields:[userId], references:[id])
}

model ActivityLog {
  id        String    @id @default(cuid())
  projectId String?
  userId    String
  module    String
  action    String
  metadata  Json?
  createdAt DateTime  @default(now())
  user      User      @relation(fields:[userId], references:[id])
}

// ── MODULE DPGF ────────────────────────────────────────

model DPGF {
  id               String      @id @default(cuid())
  projectId        String
  status           DPGFStatus  @default(DRAFT)
  currentVersionId String?
  createdById      String
  createdAt        DateTime    @default(now())
  project          Project     @relation(fields:[projectId], references:[id])
  lots             Lot[]
  versions         DPGFVersion[]
  aos              AO[]
  aiImports        AIImport[]
}

model DPGFVersion {
  id          String    @id @default(cuid())
  dpgfId      String
  name        String
  snapshotJson Json
  createdById String
  createdAt   DateTime  @default(now())
  dpgf        DPGF      @relation(fields:[dpgfId], references:[id])
}

model Lot {
  id       String    @id @default(cuid())
  dpgfId   String
  number   Int
  name     String
  position Int
  dpgf     DPGF      @relation(fields:[dpgfId], references:[id])
  sublots  SubLot[]
  posts    Post[]
}

model SubLot {
  id       String    @id @default(cuid())
  lotId    String
  number   String
  name     String
  position Int
  lot      Lot       @relation(fields:[lotId], references:[id])
  posts    Post[]
}

model Post {
  id             String    @id @default(cuid())
  lotId          String
  sublotId       String?
  ref            String    // auto-généré : "01.02.03"
  title          String
  unit           String
  qtyArchi       Float?
  unitPriceArchi Float?
  isOptional     Boolean   @default(false)
  commentArchi   String?
  libraryRefId   String?
  position       Int
  lot            Lot       @relation(fields:[lotId], references:[id])
  sublot         SubLot?   @relation(fields:[sublotId], references:[id])
  offerPosts     OfferPost[]
}

model Library {
  id        String    @id @default(cuid())
  agencyId  String
  title     String
  unit      String
  avgPrice  Float?
  minPrice  Float?
  maxPrice  Float?
  trade     String?
  usageCount Int     @default(0)
  createdAt DateTime @default(now())
  agency    Agency   @relation(fields:[agencyId], references:[id])
}

model AO {
  id               String    @id @default(cuid())
  dpgfId           String
  name             String
  lotIds           String[]
  deadline         DateTime
  instructions     String?
  status           AOStatus  @default(DRAFT)
  allowCustomQty   Boolean   @default(true)
  isPaid           Boolean   @default(false)
  paymentAmount    Float?
  clientPublished  Boolean   @default(false)
  publishedElements Json?    // quels éléments publiés au client
  createdById      String
  createdAt        DateTime  @default(now())
  dpgf             DPGF      @relation(fields:[dpgfId], references:[id])
  aoCompanies      AOCompany[]
  documents        Document[]
  qas              QA[]
}

model AOCompany {
  id             String    @id @default(cuid())
  aoId           String
  companyUserId  String
  inviteToken    String?   @unique
  tokenUsedAt    DateTime?
  status         AOCompanyStatus @default(INVITED)
  paymentStatus  String?
  ao             AO        @relation(fields:[aoId], references:[id])
  offer          Offer?
  adminDocs      AdminDoc[]
  documentReads  DocumentRead[]
  qas            QA[]
}

model Offer {
  id           String    @id @default(cuid())
  aoId         String
  aoCompanyId  String    @unique
  submittedAt  DateTime?
  isComplete   Boolean   @default(false)
  aoCompany    AOCompany @relation(fields:[aoCompanyId], references:[id])
  offerPosts   OfferPost[]
}

model OfferPost {
  id                String  @id @default(cuid())
  offerId           String
  postId            String
  qtyCompany        Float?
  qtyMotive         String?
  unitPrice         Float?
  comment           String?
  isVariant         Boolean @default(false)
  variantDescription String?
  offer             Offer   @relation(fields:[offerId], references:[id])
  post              Post    @relation(fields:[postId], references:[id])
}

model Document {
  id          String    @id @default(cuid())
  aoId        String
  name        String
  category    String    // "plans", "cctp", "notices", "photos", "autres"
  fileUrl     String
  isMandatory Boolean   @default(false)
  revision    Int       @default(1)
  uploadedById String
  createdAt   DateTime  @default(now())
  ao          AO        @relation(fields:[aoId], references:[id])
  reads       DocumentRead[]
}

model DocumentRead {
  id           String    @id @default(cuid())
  documentId   String
  aoCompanyId  String
  readAt       DateTime  @default(now())
  document     Document  @relation(fields:[documentId], references:[id])
  aoCompany    AOCompany @relation(fields:[aoCompanyId], references:[id])
  @@unique([documentId, aoCompanyId])
}

model AdminDoc {
  id              String    @id @default(cuid())
  aoCompanyId     String
  type            String    // "kbis","decennale","rcpro","rib","urssaf"
  fileUrl         String
  status          AdminDocStatus @default(PENDING)
  rejectionReason String?
  expiresAt       DateTime?
  aoCompany       AOCompany @relation(fields:[aoCompanyId], references:[id])
}

model QA {
  id           String    @id @default(cuid())
  aoId         String
  aoCompanyId  String
  title        String
  body         String
  attachmentUrl String?
  postRef      String?
  visibility   QAVisibility @default(PUBLIC)
  status       QAStatus     @default(PENDING)
  createdAt    DateTime     @default(now())
  ao           AO        @relation(fields:[aoId], references:[id])
  aoCompany    AOCompany @relation(fields:[aoCompanyId], references:[id])
  answer       QAAnswer?
}

model QAAnswer {
  id          String    @id @default(cuid())
  qaId        String    @unique
  answeredById String
  body        String
  createdAt   DateTime  @default(now())
  qa          QA        @relation(fields:[qaId], references:[id])
}

model AIImport {
  id               String    @id @default(cuid())
  dpgfId           String
  originalFilename String
  fileType         String
  aiModel          String
  rawResponse      Json?
  confidenceScores Json?
  status           AIImportStatus @default(PROCESSING)
  createdById      String
  createdAt        DateTime  @default(now())
  dpgf             DPGF      @relation(fields:[dpgfId], references:[id])
}

// ── ENUMS ──────────────────────────────────────────────

enum Role {
  ARCHITECT
  COLLABORATOR
  CLIENT
  COMPANY
  ADMIN
}

enum Plan {
  SOLO
  STUDIO
  AGENCY
}

enum ProjectStatus {
  ACTIVE
  ARCHIVED
}

enum DPGFStatus {
  DRAFT
  AO_SENT
  CLOSED
  ARCHIVED
}

enum AOStatus {
  DRAFT
  SENT
  IN_PROGRESS
  CLOSED
  ARCHIVED
}

enum AOCompanyStatus {
  INVITED
  OPENED
  IN_PROGRESS
  SUBMITTED
  INCOMPLETE
}

enum AdminDocStatus {
  PENDING
  VALID
  EXPIRED
  REJECTED
}

enum QAVisibility {
  PUBLIC
  PRIVATE
}

enum QAStatus {
  PENDING
  ANSWERED
}

enum AIImportStatus {
  PROCESSING
  REVIEW
  IMPORTED
  FAILED
}
```

---

## 6. Variables d'environnement requises

```bash
# .env.local (ne jamais committer ce fichier)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (connexion Prisma via Supabase)
DATABASE_URL=
DIRECT_URL=

# Anthropic (import IA)
ANTHROPIC_API_KEY=

# Resend (emails)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@archflow.fr

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 7. Conventions de code

### Nommage
- Composants React : PascalCase (`DPGFTable.tsx`)
- Fonctions utilitaires : camelCase (`formatPrice.ts`)
- Routes API : kebab-case (`/api/ai-import`)
- Variables base de données : camelCase dans Prisma, snake_case en SQL
- Fichiers de page Next.js : toujours `page.tsx`, `layout.tsx`

### TypeScript
- Toujours typer les props des composants avec une `interface`
- Toujours typer les retours des fonctions async
- Utiliser `Zod` pour valider toutes les entrées API
- Jamais de `any` — utiliser `unknown` si nécessaire

### Sécurité — règles absolues
- **Chaque route API** vérifie le rôle avec `requireRole()` avant de retourner des données
- **Jamais** retourner `unitPriceArchi` ou `totalEstimate` à un compte COMPANY
- **Jamais** retourner les offres des autres entreprises à un compte COMPANY
- Les tokens d'invitation sont à usage unique — les invalider après utilisation
- Toujours valider le `agencyId` pour éviter la fuite de données cross-agence

### Composants
- Utiliser shadcn/ui comme base — ne jamais réinventer les composants de base
- Les composants spécifiques au module DPGF vont dans `src/components/dpgf/`
- Les composants shell (topbar, sidebar) vont dans `src/components/shell/`
- Toujours extraire la logique métier dans des hooks custom (`useDPGF`, `useOffer`)

### API Routes
- Toujours utiliser `NextResponse.json()` avec un status code explicite
- Toujours wrapper dans un try/catch
- Toujours logger les erreurs avec `console.error` en développement
- Structure standard :
```typescript
export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['ARCHITECT', 'COLLABORATOR'])
    // logique
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Message' }, { status: 400 })
  }
}
```

---

## 8. Règles de sécurité des données

| Route | Rôles autorisés | Données filtrées |
|-------|----------------|------------------|
| `GET /api/dpgf/[id]` | ARCHITECT, COLLABORATOR | Retire `unitPriceArchi` si COLLABORATOR sans permission |
| `GET /api/ao/[id]/offers` | ARCHITECT, COLLABORATOR | — |
| `GET /api/portal/[aoId]` | COMPANY (token JWT) | Retire TOUT l'estimatif archi |
| `GET /api/client/[projectId]` | CLIENT | Retourne uniquement les données publiées |
| `POST /api/portal/[aoId]/offer` | COMPANY (token JWT) | Vérifie que l'AO est encore ouvert |

---

## 9. Design system — tokens CSS

Inspiré de l'esthétique Mesetys : épuré, aéré, typographie fine.

```css
/* globals.css */
:root {
  --bg:          #F8F8F6;
  --surface:     #FFFFFF;
  --surface2:    #F3F3F0;
  --border:      #E8E8E3;
  --border2:     #D4D4CC;
  --text:        #1A1A18;
  --text2:       #6B6B65;
  --text3:       #9B9B94;
  --green:       #1A5C3A;
  --green-mid:   #2D7A50;
  --green-light: #EAF3ED;
  --green-btn:   #1F6B44;
  --amber:       #B45309;
  --amber-light: #FEF3E2;
  --red:         #9B1C1C;
  --red-light:   #FEE8E8;
  --shadow-sm:   0 1px 3px rgba(0,0,0,.06);
  --shadow-md:   0 4px 16px rgba(0,0,0,.08);
  --radius:      8px;
  --radius-lg:   14px;
}
```

**Polices** : `DM Serif Display` pour les titres, `DM Sans` pour le corps.
Ajouter dans `layout.tsx` depuis Google Fonts.

---

## 10. État d'avancement des sprints

> Mettre à jour ce tableau après chaque sprint terminé.

| Sprint | Objectif | Statut |
|--------|----------|--------|
| S01 | Setup projet + auth shell | ✅ Terminé |
| S02 | Modèle de données + migrations Prisma | ⬜ À faire |
| S03 | DPGF — structure lots/postes + CRUD | ⬜ À faire |
| S04 | DPGF — tableau éditeur en ligne | ⬜ À faire |
| S05 | Bibliothèque d'intitulés | ⬜ À faire |
| S06 | Appel d'offre — config + invitation entreprises | ⬜ À faire |
| S07 | Portail entreprise — saisie prix + quantités | ⬜ À faire |
| S08 | Section DCE — upload + suivi lecture | ⬜ À faire |
| S09 | Q&A + Dashboard analyse + Espace client | ⬜ À faire |
| S10 | Import IA (PDF/Excel) + Stripe + Emails | ⬜ À faire |

---

## 11. Commandes utiles

```bash
# Démarrer en développement
npm run dev

# Générer les types Prisma après modification du schema
npx prisma generate

# Appliquer une migration
npx prisma migrate dev --name nom_de_la_migration

# Ouvrir Prisma Studio (interface visuelle BDD)
npx prisma studio

# Installer un composant shadcn/ui
npx shadcn-ui@latest add [component]

# Build de production
npm run build

# Vérifier les types TypeScript
npx tsc --noEmit
```

---

## 12. Ce que Claude Code ne doit PAS faire

- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` côté client
- Ne jamais retourner l'estimatif architecte dans les routes portail/client
- Ne jamais committer `.env.local`
- Ne jamais modifier les fichiers dans `src/components/ui/` (générés par shadcn)
- Ne jamais mettre de logique métier directement dans les composants — extraire dans des hooks ou des fonctions `lib/`
- Ne jamais écrire de SQL brut — toujours passer par Prisma
- Ne jamais bypasser le middleware d'auth pour "aller plus vite"
