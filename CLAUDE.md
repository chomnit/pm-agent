# CLAUDE.md — PM Agents

You are building a full-stack AI-powered project management system called **PM Agents**.
Read this entire file before writing a single line of code.
Follow every instruction exactly. Do not skip steps.

---

## What You Are Building

A web app where teams manage project ideas through a 4-stage AI agent pipeline:
**Ideation → Research → Business Analysis → Scoping**

Each idea is a **Ticket** inside a **Project**. At each stage an AI agent produces
a draft. A human reviewer gives feedback or approves it. When approved, the next
agent runs. Everything is stored in a database with full history.

The system also has two knowledge layers agents always reference:
1. **Org Knowledge Library** — company-wide docs (contracts, procedures, payment flows)
2. **Project Knowledge Base** — existing features per project

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Nuxt 4 (latest) + TypeScript |
| Styling | Tailwind CSS v4 + Nuxt UI v4 |
| State | Pinia |
| Auth | Google OAuth via nuxt-auth-utils |
| Backend | Node.js + Express + TypeScript |
| Database | MySQL |
| AI | Anthropic Claude API (@anthropic-ai/sdk) |
| Icons | Nuxt Icon (Heroicons) |
| Fonts | DM Sans + JetBrains Mono (Google Fonts) |

---

## Monorepo Structure to Create

```
pm-agents/
├── CLAUDE.md
├── .gitignore
├── README.md
├── shared/                    ← TypeScript types used by both apps
├── backend/                   ← Node.js + Express API
└── frontend/                  ← Nuxt 4 app
```

---

## PHASE 1 — Project Scaffold

### 1.1 Root files

Create `.gitignore`:
```
node_modules/
.env
.env.local
dist/
.nuxt/
.output/
*.log
.DS_Store
```

---

### 1.2 Shared Package

Create `shared/package.json`:
```json
{
  "name": "@pm-agents/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

Create `shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

Create `shared/src/index.ts` with all interfaces:
```typescript
// ─── Users ───────────────────────────────────────────────────────
export interface User {
  id: string
  googleId: string
  email: string
  name: string
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
}

// ─── Projects ────────────────────────────────────────────────────
export interface Project {
  id: string
  name: string
  description: string | null
  slug: string
  createdBy: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
  members?: ProjectMember[]
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: 'owner' | 'member'
  invitedBy: string | null
  joinedAt: string
  user?: User
}

// ─── Org Knowledge ───────────────────────────────────────────────
export type KnowledgeCategory =
  | 'legal_contracts'
  | 'procedures'
  | 'templates'
  | 'system_architecture'
  | 'payment_flows'

export type KnowledgeStatus = 'active' | 'inactive' | 'draft'

export type AgentType = 'ideation' | 'research' | 'ba' | 'scoping'

export interface OrgKnowledgeItem {
  id: string
  title: string
  category: KnowledgeCategory
  content: string
  sourceFile: string | null
  status: KnowledgeStatus
  usedByAll: boolean
  version: string | null
  agentTypes: AgentType[]
  createdBy: string
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

// ─── Project Features ────────────────────────────────────────────
export type FeatureStatus = 'live' | 'in_development' | 'deprecated'

export interface ProjectFeature {
  id: string
  projectId: string
  name: string
  category: string
  status: FeatureStatus
  description: string
  functionality: string | null
  userRoles: string[]
  integrations: string[]
  limitations: string | null
  tags: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ─── Tickets ─────────────────────────────────────────────────────
export type TicketPriority = 'low' | 'medium' | 'high'
export type TicketStatus   = 'backlog' | 'in_progress' | 'review' | 'approved'
export type StageType      = 'ideation' | 'research' | 'ba' | 'scoping'
export type StageStatus    =
  | 'pending' | 'running' | 'in_review' | 'needs_revision' | 'approved'

export interface Ticket {
  id: string
  projectId: string
  ticketNumber: number
  title: string
  description: string | null
  priority: TicketPriority
  status: TicketStatus
  currentStage: StageType | null
  createdBy: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
  createdByUser?: User
  stages?: TicketStage[]
}

// ─── Stages ──────────────────────────────────────────────────────
export interface TicketStage {
  id: string
  ticketId: string
  stageType: StageType
  stageOrder: number
  status: StageStatus
  assignedTo: string | null
  assignedBy: string | null
  assignedAt: string | null
  approvedBy: string | null
  approvedAt: string | null
  runCount: number
  revisionCount: number
  createdAt: string
  updatedAt: string
  assignedToUser?: User
  latestDraft?: StageDraft
}

// ─── Drafts ──────────────────────────────────────────────────────
export interface StageDraft {
  id: string
  stageId: string
  versionNumber: number
  content: string
  modelUsed: string | null
  tokensUsed: number | null
  isApproved: boolean
  createdAt: string
}

// ─── Feedback ────────────────────────────────────────────────────
export interface StageFeedback {
  id: string
  stageId: string
  draftId: string
  givenBy: string
  feedbackText: string
  createdAt: string
  givenByUser?: User
  onDraftVersion?: number
}

// ─── API ─────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  details?: string
}
```

Run `npm install && npm run build` inside `shared/`.

---

### 1.3 Backend Scaffold

Run inside `backend/`:
```bash
npm init -y
npm install express cors dotenv helmet morgan mysql2 passport \
  passport-google-oauth20 express-session uuid @anthropic-ai/sdk \
  multer pdf-parse mammoth
npm install -D typescript ts-node nodemon @types/express @types/cors \
  @types/passport @types/passport-google-oauth20 @types/express-session \
  @types/uuid @types/morgan @types/node @types/multer
```

Create `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

Create `backend/nodemon.json`:
```json
{
  "watch": ["src"],
  "ext": "ts,json,md",
  "exec": "ts-node src/index.ts"
}
```

Add to `backend/package.json` scripts:
```json
{
  "scripts": {
    "dev": "nodemon",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

Create `backend/.env.example`:
```
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=pm_agents
SESSION_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
ANTHROPIC_API_KEY=
FRONTEND_URL=http://localhost:3000
```

Copy `.env.example` to `.env` and fill in real values.

---

### 1.4 Frontend Scaffold

Run in the monorepo root:
```bash
npx nuxi@latest init frontend
cd frontend
npm install @nuxt/ui @pinia/nuxt nuxt-auth-utils \
  @nuxtjs/google-fonts @vueuse/nuxt @vueuse/core @nuxtjs/mdc ofetch
```

Create `frontend/nuxt.config.ts`:
```typescript
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    'nuxt-auth-utils',
    '@nuxtjs/google-fonts',
    '@vueuse/nuxt',
    '@nuxtjs/mdc'
  ],

  googleFonts: {
    families: {
      'DM Sans': [400, 500, 600],
      'JetBrains Mono': [400]
    },
    display: 'swap'
  },

  runtimeConfig: {
    sessionSecret: '',
    googleClientId: '',
    googleClientSecret: '',
    public: {
      apiBase: 'http://localhost:3001'
    }
  },

  css: ['~/assets/css/main.css']
})
```

Create `frontend/.env`:
```
NUXT_PUBLIC_API_BASE=http://localhost:3001
NUXT_SESSION_SECRET=
NUXT_GOOGLE_CLIENT_ID=
NUXT_GOOGLE_CLIENT_SECRET=
```

Create `frontend/assets/css/main.css`:
```css
@import "tailwindcss";

:root {
  --color-bg:         #F5F4F1;
  --color-sidebar:    #161616;
  --color-card:       #FFFFFF;
  --color-border:     #E8E6E0;
  --color-text:       #1A1A1A;
  --color-muted:      #6B6B6B;
  --font-sans:        'DM Sans', sans-serif;
  --font-mono:        'JetBrains Mono', monospace;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-bg);
  color: var(--color-text);
}

.mono { font-family: var(--font-mono); }
```

---

## PHASE 2 — Database

### 2.1 Create Database

```sql
CREATE DATABASE pm_agents
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE pm_agents;
```

### 2.2 Schema

Run this full schema in order:

```sql
-- 1. users
CREATE TABLE users (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  google_id   VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  avatar_url  TEXT         NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_google_id (google_id),
  UNIQUE KEY uq_users_email (email)
);

-- 2. projects
CREATE TABLE projects (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  name        VARCHAR(255) NOT NULL,
  description TEXT         NULL,
  slug        VARCHAR(100) NOT NULL,
  created_by  CHAR(36)     NOT NULL,
  is_archived BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_projects_slug (slug),
  CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 3. project_members
CREATE TABLE project_members (
  id          CHAR(36)              NOT NULL DEFAULT (UUID()),
  project_id  CHAR(36)              NOT NULL,
  user_id     CHAR(36)              NOT NULL,
  role        ENUM('owner','member') NOT NULL DEFAULT 'member',
  invited_by  CHAR(36)              NULL,
  joined_at   DATETIME              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_members (project_id, user_id),
  CONSTRAINT fk_pm_project    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_user       FOREIGN KEY (user_id)    REFERENCES users(id),
  CONSTRAINT fk_pm_invited_by FOREIGN KEY (invited_by) REFERENCES users(id)
);

-- 4. org_knowledge_items
CREATE TABLE org_knowledge_items (
  id           CHAR(36)     NOT NULL DEFAULT (UUID()),
  title        VARCHAR(255) NOT NULL,
  category     ENUM('legal_contracts','procedures','templates',
                    'system_architecture','payment_flows') NOT NULL,
  content      LONGTEXT     NOT NULL,
  source_file  VARCHAR(255) NULL,
  status       ENUM('active','inactive','draft') NOT NULL DEFAULT 'draft',
  used_by_all  BOOLEAN      NOT NULL DEFAULT FALSE,
  version      VARCHAR(50)  NULL,
  created_by   CHAR(36)     NOT NULL,
  updated_by   CHAR(36)     NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_oki_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_oki_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- 5. org_knowledge_agent_map
CREATE TABLE org_knowledge_agent_map (
  id                    CHAR(36) NOT NULL DEFAULT (UUID()),
  org_knowledge_item_id CHAR(36) NOT NULL,
  agent_type            ENUM('ideation','research','ba','scoping') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_okam (org_knowledge_item_id, agent_type),
  CONSTRAINT fk_okam_item FOREIGN KEY (org_knowledge_item_id)
    REFERENCES org_knowledge_items(id) ON DELETE CASCADE
);

-- 6. project_features
CREATE TABLE project_features (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  project_id    CHAR(36)     NOT NULL,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(100) NOT NULL,
  status        ENUM('live','in_development','deprecated') NOT NULL DEFAULT 'in_development',
  description   TEXT         NOT NULL,
  functionality LONGTEXT     NULL,
  user_roles    JSON         NULL,
  integrations  JSON         NULL,
  limitations   TEXT         NULL,
  tags          JSON         NULL,
  created_by    CHAR(36)     NOT NULL,
  updated_by    CHAR(36)     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_pf_project    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pf_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_pf_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- 7. agent_skills
CREATE TABLE agent_skills (
  id            CHAR(36)  NOT NULL DEFAULT (UUID()),
  agent_type    ENUM('ideation','research','ba','scoping') NOT NULL,
  version       INT       NOT NULL DEFAULT 1,
  system_prompt LONGTEXT  NOT NULL,
  is_active     BOOLEAN   NOT NULL DEFAULT FALSE,
  notes         TEXT      NULL,
  created_by    CHAR(36)  NOT NULL,
  created_at    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ask_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 8. tickets
CREATE TABLE tickets (
  id             CHAR(36)     NOT NULL DEFAULT (UUID()),
  project_id     CHAR(36)     NOT NULL,
  ticket_number  INT          NOT NULL,
  title          VARCHAR(255) NOT NULL,
  description    TEXT         NULL,
  priority       ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  status         ENUM('backlog','in_progress','review','approved') NOT NULL DEFAULT 'backlog',
  current_stage  ENUM('ideation','research','ba','scoping') NULL,
  created_by     CHAR(36)     NOT NULL,
  is_archived    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ticket_number (project_id, ticket_number),
  CONSTRAINT fk_tickets_project    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_tickets_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Auto-increment ticket_number per project
DELIMITER $$
CREATE TRIGGER trg_ticket_number
BEFORE INSERT ON tickets
FOR EACH ROW
BEGIN
  SET NEW.ticket_number = (
    SELECT COALESCE(MAX(ticket_number), 0) + 1
    FROM tickets WHERE project_id = NEW.project_id
  );
END$$
DELIMITER ;

-- 9. ticket_stages
CREATE TABLE ticket_stages (
  id              CHAR(36)  NOT NULL DEFAULT (UUID()),
  ticket_id       CHAR(36)  NOT NULL,
  stage_type      ENUM('ideation','research','ba','scoping') NOT NULL,
  stage_order     TINYINT   NOT NULL,
  status          ENUM('pending','running','in_review','needs_revision','approved')
                            NOT NULL DEFAULT 'pending',
  assigned_to     CHAR(36)  NULL,
  assigned_by     CHAR(36)  NULL,
  assigned_at     DATETIME  NULL,
  approved_by     CHAR(36)  NULL,
  approved_at     DATETIME  NULL,
  run_count       INT       NOT NULL DEFAULT 0,
  revision_count  INT       NOT NULL DEFAULT 0,
  created_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ticket_stage (ticket_id, stage_type),
  CONSTRAINT fk_ts_ticket      FOREIGN KEY (ticket_id)    REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ts_assigned_to FOREIGN KEY (assigned_to)  REFERENCES users(id),
  CONSTRAINT fk_ts_assigned_by FOREIGN KEY (assigned_by)  REFERENCES users(id),
  CONSTRAINT fk_ts_approved_by FOREIGN KEY (approved_by)  REFERENCES users(id)
);

-- 10. stage_drafts
CREATE TABLE stage_drafts (
  id              CHAR(36)     NOT NULL DEFAULT (UUID()),
  stage_id        CHAR(36)     NOT NULL,
  version_number  INT          NOT NULL,
  content         LONGTEXT     NOT NULL,
  prompt_used     LONGTEXT     NULL,
  model_used      VARCHAR(100) NULL,
  tokens_used     INT          NULL,
  is_approved     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_draft_version (stage_id, version_number),
  CONSTRAINT fk_sd_stage FOREIGN KEY (stage_id) REFERENCES ticket_stages(id) ON DELETE CASCADE
);

-- 11. stage_feedback
CREATE TABLE stage_feedback (
  id            CHAR(36)  NOT NULL DEFAULT (UUID()),
  stage_id      CHAR(36)  NOT NULL,
  draft_id      CHAR(36)  NOT NULL,
  given_by      CHAR(36)  NOT NULL,
  feedback_text TEXT      NOT NULL,
  created_at    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_sf_stage    FOREIGN KEY (stage_id) REFERENCES ticket_stages(id) ON DELETE CASCADE,
  CONSTRAINT fk_sf_draft    FOREIGN KEY (draft_id) REFERENCES stage_drafts(id),
  CONSTRAINT fk_sf_given_by FOREIGN KEY (given_by) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_tickets_project_status  ON tickets(project_id, status, is_archived);
CREATE INDEX idx_stages_ticket           ON ticket_stages(ticket_id, stage_order);
CREATE INDEX idx_drafts_stage_version    ON stage_drafts(stage_id, version_number DESC);
CREATE INDEX idx_feedback_stage          ON stage_feedback(stage_id, created_at);
CREATE INDEX idx_oki_status_category     ON org_knowledge_items(status, category);
CREATE INDEX idx_pf_project_status       ON project_features(project_id, status);
```

---

## PHASE 3 — Backend Implementation

Build these files in order. Each file must be complete and functional before moving on.

---

### 3.1 `src/config/db.ts`
MySQL connection pool using mysql2/promise. Read from `.env`.

### 3.2 `src/config/claude.ts`
Anthropic SDK instance. Read `ANTHROPIC_API_KEY` from `.env`.

### 3.3 `src/config/google-oauth.ts`
Passport Google OAuth 2.0 strategy.
- On success: find or create user in `users` table by `google_id`
- Store `{ id, email, name, avatarUrl }` in session
- Serialize/deserialize user from session

### 3.4 `src/index.ts`
Express app entry point with:
- helmet, morgan, cors (origin: FRONTEND_URL, credentials: true)
- express-session + passport
- All route mounts
- GET /health endpoint

---

### 3.5 Models

Each model is a set of async functions that query MySQL.
Use parameterized queries. Never raw string interpolation.

**`src/models/user.model.ts`**
```
findById(id)
findByGoogleId(googleId)
findByEmail(email)
create({ googleId, email, name, avatarUrl })
update(id, { name, avatarUrl })
```

**`src/models/project.model.ts`**
```
findById(id)
findByUserId(userId)            ← projects where user is a member
create({ name, description, slug, createdBy })
update(id, { name, description })
archive(id)
addMember(projectId, userId, role, invitedBy)
removeMember(projectId, userId)
getMembers(projectId)
isMember(projectId, userId)     ← returns boolean
```

**`src/models/ticket.model.ts`**
```
findById(id)
findByProjectId(projectId)
findByProjectIdAndStatus(projectId, status)
create({ projectId, title, description, priority, createdBy })
updateStatus(id, status)
updateCurrentStage(id, stageType)
archive(id)
```

After creating a ticket, immediately insert 4 rows into `ticket_stages`:
```
(ticketId, 'ideation', 1, 'pending')
(ticketId, 'research', 2, 'pending')
(ticketId, 'ba',       3, 'pending')
(ticketId, 'scoping',  4, 'pending')
```

**`src/models/stage.model.ts`**
```
findByTicketId(ticketId)
findById(id)
findByTicketAndType(ticketId, stageType)
updateStatus(id, status)
assignReviewer(id, assignedTo, assignedBy)
approve(id, approvedBy)
incrementRunCount(id)
incrementRevisionCount(id)
```

**`src/models/draft.model.ts`**
```
findByStageId(stageId)              ← all drafts, ordered by version
findLatestByStageId(stageId)        ← highest version_number
create({ stageId, versionNumber, content, promptUsed, modelUsed, tokensUsed })
markApproved(id)
```

**`src/models/feedback.model.ts`**
```
findByStageId(stageId)
create({ stageId, draftId, givenBy, feedbackText })
```

**`src/models/knowledge.model.ts`**
```
findAll()
findById(id)
findActive()
findActiveByAgentType(agentType)
create({ title, category, content, sourceFile, status, usedByAll, version, createdBy })
update(id, fields)
updateAgentMap(id, agentTypes[])    ← delete + reinsert agent map rows
delete(id)
```

**`src/models/feature.model.ts`**
```
findByProjectId(projectId)
findById(id)
create({ projectId, name, category, status, description,
         functionality, userRoles, integrations, limitations, tags, createdBy })
update(id, fields)
delete(id)
```

---

### 3.6 Middleware

**`src/middleware/auth.middleware.ts`**
```typescript
// Checks req.isAuthenticated() from passport session
// Returns 401 if not logged in
export const requireAuth = (req, res, next) => { ... }
```

**`src/middleware/role.middleware.ts`**
```typescript
// Checks if req.user.id is a member of req.params.projectId
// Returns 403 if not a member
export const requireProjectMember = async (req, res, next) => { ... }
```

---

### 3.7 Routes & Controllers

Build each route + controller pair together.

**Auth** (`/auth`)
```
GET  /auth/google                → passport.authenticate('google')
GET  /auth/google/callback       → passport.authenticate + redirect to frontend /dashboard
GET  /auth/me                    → return req.user or 401
POST /auth/logout                → req.logout() + clear session
```

**Users** (`/api/users`)
```
GET /api/users/me                → current user profile (requireAuth)
```

**Projects** (`/api/projects`)
```
GET    /api/projects             → list projects for current user (requireAuth)
POST   /api/projects             → create project (requireAuth)
GET    /api/projects/:id         → get project + members (requireAuth + requireProjectMember)
PATCH  /api/projects/:id         → update project (requireAuth + requireProjectMember)
DELETE /api/projects/:id         → archive project (requireAuth + owner only)
POST   /api/projects/:id/members → add member by email (requireAuth + owner only)
DELETE /api/projects/:id/members/:userId → remove member (requireAuth + owner only)
```

**Features** (`/api/projects/:id/features`)
```
GET    /api/projects/:id/features      → list features (requireAuth + requireProjectMember)
POST   /api/projects/:id/features      → create feature
GET    /api/projects/:id/features/:fid → get feature
PATCH  /api/projects/:id/features/:fid → update feature
DELETE /api/projects/:id/features/:fid → delete feature
```

**Tickets** (`/api/tickets`)
```
GET    /api/tickets?projectId=   → list tickets for project (requireAuth + requireProjectMember)
POST   /api/tickets              → create ticket + auto-create 4 stages
GET    /api/tickets/:id          → get ticket + all stages + latest drafts
PATCH  /api/tickets/:id/status   → update kanban status
DELETE /api/tickets/:id          → archive ticket
```

**Stages** (`/api/stages`)
```
GET    /api/stages/:id                → get stage + drafts + feedback
POST   /api/stages/:id/assign         → assign reviewer { assignedTo: userId }
POST   /api/stages/:id/run            → trigger agent (see agent service)
POST   /api/stages/:id/feedback       → submit feedback { feedbackText }
POST   /api/stages/:id/approve        → approve stage
GET    /api/stages/:id/drafts         → all drafts for stage
```

**Knowledge** (`/api/knowledge`)
```
GET    /api/knowledge            → list all org knowledge items (requireAuth)
POST   /api/knowledge            → create item
GET    /api/knowledge/:id        → get item
PATCH  /api/knowledge/:id        → update item
DELETE /api/knowledge/:id        → delete item
POST   /api/knowledge/upload     → upload PDF/DOCX, extract text, return as string
```

---

### 3.8 Agent Skills (Markdown Files)

Create these 4 files. They are the agent system prompts.

**`src/agents/skills/ideation.skill.md`**
```markdown
# Ideation Agent

## Role
You are a senior product strategist helping a fintech team analyze and shape
raw ideas into structured product concepts. You have deep knowledge of payment
systems, merchant services, and digital banking.

## Task
Given a raw idea or feature request, produce a structured Ideation Canvas.

## Output Format
Return a clean markdown document with these exact sections:

### Problem Statement
What specific pain point does this solve? Who experiences it and how often?

### Target Users
Who are the primary and secondary users of this feature?

### Value Proposition
What unique value does this deliver? Why now?

### Key Assumptions
What must be true for this to succeed? List 3-5 assumptions.

### Risks & Concerns
What could go wrong? What dependencies exist?

### Success Metrics
How will we measure if this feature is successful?

### Open Questions
What needs to be answered before moving forward?

## Rules
- Be specific to the payment/fintech domain
- Reference existing context when provided
- If the idea is too vague, note what's missing in Open Questions
- Output only the markdown document, no preamble
```

**`src/agents/skills/research.skill.md`**
```markdown
# Research Agent

## Role
You are a research analyst specializing in fintech, payment systems, and
digital banking. You synthesize existing context and knowledge to provide
actionable insights.

## Task
Given an idea canvas from the Ideation stage, produce a Research Summary that
provides context, validates assumptions, and identifies relevant patterns.

## Output Format
Return a clean markdown document with these exact sections:

### Market Context
What is the broader context for this feature? Industry trends, regulations, standards.

### Existing Solutions
What similar solutions exist internally or in the market? What can we learn?

### Technical Landscape
What technical standards, protocols, or integrations are relevant?
(e.g. KHQR, EMVCo, NBC guidelines, relevant APIs)

### Validated Assumptions
Which assumptions from the Ideation stage are supported by research?

### Challenged Assumptions
Which assumptions need revisiting based on research findings?

### Key Insights
3-5 most important findings that should inform the BA and Scoping stages.

### Recommended References
Sources, standards, or internal documents the BA agent should consult.

## Rules
- Ground findings in the provided organizational and project context
- Be specific, not generic
- Flag regulatory or compliance considerations prominently
- Output only the markdown document, no preamble
```

**`src/agents/skills/ba.skill.md`**
```markdown
# Business Analysis Agent

## Role
You are a senior business analyst specializing in fintech products. You
translate validated ideas into clear, structured requirements that engineering
teams can act on.

## Task
Given the Ideation Canvas and Research Summary, produce a complete Business
Analysis document following the organization's PRD structure.

## Output Format
Return a clean markdown document with these exact sections:

### Executive Summary
One paragraph summarizing what is being built and why.

### User Stories
Format: "As a [user type], I want to [action] so that [benefit]."
Include acceptance criteria for each story.

### Functional Requirements
Numbered list of specific things the system must do.

### Non-Functional Requirements
Performance, security, availability, compliance requirements.

### System Interactions
Which systems will this feature interact with? What data flows where?

### Constraints & Limitations
Technical, regulatory, or business constraints that bound the solution.

### Out of Scope
Explicitly list what this feature will NOT include.

### Assumptions Made
Decisions made where requirements were ambiguous.

### Open Items
Questions that must be answered before development begins.

## Rules
- Write requirements that are testable and unambiguous
- Reference the existing feature context to avoid duplication
- Flag any contract or compliance implications
- Follow the team's product development procedure for required sections
- Output only the markdown document, no preamble
```

**`src/agents/skills/scoping.skill.md`**
```markdown
# Scoping Agent

## Role
You are a senior technical project manager specializing in fintech delivery.
You translate business requirements into realistic, phased delivery plans.

## Task
Given all previous stage outputs, produce a Scoping Document that defines
what will be built, in what phases, with what effort.

## Output Format
Return a clean markdown document with these exact sections:

### Scope Summary
What is definitively included in this delivery.

### Delivery Phases
Break delivery into 2-4 phases. For each phase:
- Phase name and goal
- Features/requirements included
- Estimated effort (S/M/L/XL t-shirt sizing)
- Dependencies
- Definition of done

### Technical Dependencies
External systems, APIs, or teams that must be involved.

### Resource Requirements
Roles needed (FE dev, BE dev, QA, DevOps, etc.) and rough allocation.

### Risk Register
| Risk | Probability | Impact | Mitigation |
|---|---|---|---|

### Timeline Estimate
Rough timeline for each phase based on t-shirt sizes.
S=1-3 days, M=3-7 days, L=1-3 weeks, XL=3-6 weeks.

### Recommended Phase 1 MVP
If we had to ship the smallest valuable version, what would it include?

### Success Criteria for Delivery
How do we know each phase is done?

## Rules
- Be conservative with estimates, not optimistic
- Phase 1 should always be a shippable MVP
- Highlight the critical path clearly
- Reference the product development procedure for required approval gates
- Output only the markdown document, no preamble
```

---

### 3.9 Context Service

**`src/services/context.service.ts`**

This service assembles the full prompt context for an agent run.

```typescript
async function buildContext(agentType, ticketId, projectId): Promise<string>
```

It must:
1. Load the agent skill file from `./agents/skills/${agentType}.skill.md`
   (check DB `agent_skills` for active override first, fall back to file)
2. Load active org knowledge items for this agent type from DB
3. Load all project features for this project from DB (exclude deprecated)
4. Load all previous approved stage outputs for this ticket
5. Assemble into this structure:

```
[AGENT SKILL]
{skill file content}

[ORGANIZATIONAL KNOWLEDGE]
--- {item.title} ({item.category}) ---
{item.content}

[PROJECT KNOWLEDGE BASE - Existing Features]
--- {feature.name} [{feature.status}] ---
Category: {feature.category}
Description: {feature.description}
Functionality: {feature.functionality}
User Roles: {feature.userRoles.join(', ')}
Integrations: {feature.integrations.join(', ')}
Limitations: {feature.limitations}

[PREVIOUS STAGE OUTPUTS]
--- IDEATION STAGE (Approved) ---
{approved ideation draft content}

[CURRENT TASK]
Ticket: {ticket.title}
Priority: {ticket.priority}
Description: {ticket.description}

{stage-specific instruction}
```

Stage-specific instructions:
- ideation: "Analyze this idea and produce the Ideation Canvas."
- research: "Using the Ideation Canvas above, produce the Research Summary."
- ba: "Using all context above, produce the Business Analysis document."
- scoping: "Using all context above, produce the Scoping document."

---

### 3.10 Agent Service

**`src/services/agent.service.ts`**

```typescript
async function runAgent(stageId: string, triggeredBy: string): Promise<void>
```

Steps:
1. Load stage from DB. Verify status is 'pending' or 'needs_revision'.
2. Load ticket from stage.ticketId
3. Set stage status → 'running', increment run_count
4. Call `contextService.buildContext(stage.stageType, stage.ticketId, ticket.projectId)`
5. Get next version number (latest draft version + 1, or 1 if first run)
6. If revision: load all previous drafts + feedback and append to prompt:
   ```
   [REVISION HISTORY]
   Draft 1:
   {draft 1 content}
   
   Feedback on Draft 1:
   {feedback text}
   
   Draft 2:
   {draft 2 content}
   
   Feedback on Draft 2:
   {feedback text}
   
   [YOUR TASK]
   Produce an improved draft addressing all feedback above.
   ```
7. Call Claude API:
   ```typescript
   const response = await claude.messages.create({
     model: 'claude-sonnet-4-5',
     max_tokens: 4096,
     system: fullPrompt,
     messages: [{ role: 'user', content: 'Produce your output now.' }]
   })
   ```
8. Extract text from response.content[0]
9. Save draft to `stage_drafts` with full prompt, model, tokens
10. Set stage status → 'in_review'
11. Update ticket.current_stage if needed
```

---

## PHASE 4 — Frontend Implementation

Build pages in this exact order. Each must be visually complete before moving on.

---

### Design Tokens (use everywhere)

```
Background:     #F5F4F1
Sidebar:        #161616
Cards:          #FFFFFF
Border:         #E8E6E0
Text:           #1A1A1A
Muted:          #6B6B6B

Priority HIGH:   bg-red-100    text-red-600
Priority MEDIUM: bg-amber-100  text-amber-600
Priority LOW:    bg-green-100  text-green-700

Stage Ideation:  bg-violet-100 text-violet-700
Stage Research:  bg-blue-100   text-blue-700
Stage BA:        bg-pink-100   text-pink-700
Stage Scoping:   bg-emerald-100 text-emerald-700

Status backlog:     dot gray-400
Status in_progress: dot blue-500
Status review:      dot amber-500
Status approved:    dot emerald-500
```

---

### 4.1 Layouts

**`app/layouts/auth.vue`**
Centered full-height page, warm background, no sidebar.

**`app/layouts/default.vue`**
Fixed sidebar (256px) + main area with fixed header (56px) + scrollable content.

Sidebar structure:
```
Top:    Logo "PM Agents" + current project name (muted, small)
Nav:    Board, Knowledge Base, Members, Settings
Bottom: divider + API Docs + Support + user avatar + name + sign out
```

Active nav item: white bg, rounded-lg.
Inactive: text-gray-400, hover:text-white.

---

### 4.2 Auth Middleware

**`app/middleware/auth.ts`**
```typescript
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) return navigateTo('/login')
})
```

Apply `definePageMeta({ middleware: 'auth' })` to all pages except login.

---

### 4.3 Login Page (`app/pages/login.vue`)

Layout: auth. Centered card.
- App icon + "PM Agents" heading
- Subtitle: "AI-powered project management"
- Google Sign In button: white, border, Google SVG logo, "Continue with Google"
- On click: `window.location.href = 'http://localhost:3001/auth/google'`

---

### 4.4 Dashboard (`app/pages/dashboard.vue`)

Fetch `GET /api/projects` on mount.

Header: "Projects" title + "+ New Project" button (top right)

Project cards grid (3 cols desktop, 2 tablet, 1 mobile):
```
[icon]  Project Name
        by Creator Name

Short description...

─────────────────────
N members  •  N tickets
[avatars]        Open →
```

Hover: shadow-md + translate-y-[-2px]

New Project modal fields: Name (required) + Description (optional)
On submit: `POST /api/projects` → navigate to `/projects/:id`

Empty state: illustration + "Create your first project" + button

---

### 4.5 Project Detail (`app/pages/projects/[id]/index.vue`)

Tabs: Board | Knowledge Base | Members

**Board tab — Kanban:**

4 columns: BACKLOG | IN PROGRESS | REVIEW | APPROVED
Each column: colored dot + name + count badge

Ticket Card:
```
TICKET-001              [HIGH]

Title of the ticket

Description preview
truncated 2 lines...

[Ideation pill]        [⋮]
```

Ticket number: monospace, muted
Priority badge: colored pill
Stage pill: colored by stage type
Three-dot menu: View, Assign Reviewer, Archive

In-Progress cards: pulsing blue dot + "Agent running..."

Click card → `/projects/:id/tickets/:ticketId`

New Ticket slide-over (from right, 400px):
Fields: Title, Description, Priority
Submit: `POST /api/tickets`

**Knowledge Base tab:**
Blue banner: "Org Library Active (N docs)" + "Manage →" link
Feature cards grid same as wireframe

**Members tab:**
List of members with avatar, name, role badge
Owner cannot be removed
"+  Invite Member" → email input modal → `POST /api/projects/:id/members`

---

### 4.6 Knowledge Library (`app/pages/knowledge/index.vue`)

Global page (not project-specific). Accessible from sidebar.

Fetch `GET /api/knowledge` on mount.

Filter bar: search input + Category dropdown + Agent dropdown
Cards grouped by category (collapsible sections with count)

Document Card:
```
[icon]  Title              version badge
        category

Description preview 3 lines...

[● Ideation] [● BA] [● Scoping]

Updated 2 days ago
[Active ●]              Edit →
```

Active toggle: `PATCH /api/knowledge/:id { status }`

---

### 4.7 Knowledge Item Editor (`app/pages/knowledge/[id].vue`)

Split panel (60/40):

Left: editor
- Title input
- Category select (5 options)
- Source file input
- Agent checkboxes (Ideation, Research, BA, Scoping + "All Agents" toggle)
- Status select (Active / Inactive / Draft)
- Markdown editor with toolbar: B I H1 H2 List Code
- Upload button: sends to `POST /api/knowledge/upload` → inserts extracted text

Right: live markdown preview (use @nuxtjs/mdc)

Save: `PATCH /api/knowledge/:id`
Delete: confirmation dialog → `DELETE /api/knowledge/:id`

---

### 4.8 Feature Editor (`app/pages/projects/[id]/knowledge/[featureId].vue`)

Single column form:
- Feature Name
- Category + Status (side by side)
- Description (textarea)
- Functionality (markdown textarea)
- User Roles (tag input: type + enter to add, × to remove)
- Integrations (tag input)
- Limitations (textarea)
- Tags (tag input)

Save fixed bottom-right. Delete with confirmation.

---

### 4.9 Ticket Detail — THE MAIN PAGE (`app/pages/projects/[id]/tickets/[ticketId].vue`)

This is the most important page. Build it with the most care.

**Top section:**
```
← Back to Board

TICKET-001                                     [HIGH]
Title of the ticket here
Created by Chomnit • 2 hours ago

[Assign Reviewer ▾]   [▶ Run Agent]   [⋮]
```

**Stage progress bar:**
```
● Ideation  ──────  ○ Research  ──  ○ BA  ──  ○ Scoping
```
Filled + green line = approved. Pulsing = current active. Empty = pending.

**Two-column layout (2/3 + 1/3):**

LEFT PANEL — Current Stage:
```
Stage: Ideation
Status badge (In Review / Needs Revision / Approved)
Assigned to: [avatar] Sohail

┌─────────────────────────────────────┐
│  AGENT OUTPUT                       │
│  Draft 2 of 3                       │
│                                     │
│  {rendered markdown content}        │
│                                     │
└─────────────────────────────────────┘

[▾ View revision history (2 drafts)]

──── Feedback ─────────────────────────

[textarea: "What needs to change?"]

[Request Revision]   [Approve & Continue ✓]
```

RIGHT PANEL — Info sidebar:
```
Ticket Info
───────────
Priority:  [HIGH badge]
Created:   2 hours ago
Project:   PayWay 2026

Assigned Reviewer
─────────────────
[avatar] Sohail
[Change]

Stage History
─────────────
✓ Ideation    Mengchu
● Research    Sohail (active)
○ BA          —
○ Scoping     —
```

**Agent running state:**
- Replace output panel with animated skeleton (shimmer)
- Pulsing blue dot next to stage name
- "Agent is thinking..." with animated dots
- Disable Run Agent + Approve buttons
- Poll `GET /api/stages/:id` every 3 seconds
- Stop polling when status !== 'running'

**Revision history (collapsible):**
Show each draft version with:
- "Draft N — {date}"
- The draft content (collapsed, click to expand)
- Feedback given on that draft (if any) + who gave it

**Assign reviewer button:**
Dropdown showing project members (avatar + name)
On select: `POST /api/stages/:id/assign { assignedTo: userId }`

**Run Agent button:**
Only enabled when stage status is 'pending' or 'needs_revision'
On click: `POST /api/stages/:id/run` → start polling

**Approve button:**
Only shown to the assigned reviewer
On click: `POST /api/stages/:id/approve` → next stage unlocks

**Request Revision button:**
Only shown to the assigned reviewer + feedback textarea not empty
On click: `POST /api/stages/:id/feedback { feedbackText }` → stage → needs_revision

---

### 4.10 Composables

**`composables/useAgent.ts`**
```typescript
export const useAgent = () => {
  const config = useRuntimeConfig()
  const base = config.public.apiBase

  const runAgent = (stageId: string) =>
    $fetch(`${base}/api/stages/${stageId}/run`, { method: 'POST', credentials: 'include' })

  const pollStageStatus = async (stageId: string, onComplete: (stage) => void) => {
    const interval = setInterval(async () => {
      const stage = await $fetch(`${base}/api/stages/${stageId}`, { credentials: 'include' })
      if (stage.status !== 'running') {
        clearInterval(interval)
        onComplete(stage)
      }
    }, 3000)
    return () => clearInterval(interval)  // cleanup function
  }

  const submitFeedback = (stageId: string, feedbackText: string) =>
    $fetch(`${base}/api/stages/${stageId}/feedback`, {
      method: 'POST', credentials: 'include',
      body: { feedbackText }
    })

  const approveStage = (stageId: string) =>
    $fetch(`${base}/api/stages/${stageId}/approve`, { method: 'POST', credentials: 'include' })

  const assignReviewer = (stageId: string, assignedTo: string) =>
    $fetch(`${base}/api/stages/${stageId}/assign`, {
      method: 'POST', credentials: 'include',
      body: { assignedTo }
    })

  return { runAgent, pollStageStatus, submitFeedback, approveStage, assignReviewer }
}
```

---

## PHASE 5 — Polish

Only after all pages are functionally complete:

1. **Empty states** — every list page needs an illustration + message + CTA when empty
2. **Loading states** — skeleton cards while fetching data
3. **Error handling** — toast notifications for API errors
4. **Animations:**
   - Card hover: `transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`
   - Slide-over: `transition: transform 300ms ease`
   - Stage progress line: `transition: width 500ms ease`
   - Agent thinking: CSS shimmer animation on skeleton
5. **Responsive** — ensure board scrolls horizontally on mobile
6. **Toast system** — success/error toasts using Nuxt UI's useToast

---

## Build Order Summary

```
Phase 1  Scaffold monorepo + install dependencies
Phase 2  Create database + run schema
Phase 3  Backend (in order):
           config → models → middleware → routes/controllers → skills → context service → agent service
Phase 4  Frontend (in order):
           layouts → auth → login → dashboard → project detail →
           knowledge library → feature editor → ticket detail
Phase 5  Polish + empty states + error handling
```

At each phase, test before moving on:
- Backend: use curl or Postman to verify each endpoint
- Frontend: visually verify each page before building the next

---

## Important Rules

1. **Never use raw string interpolation in SQL** — always use parameterized queries
2. **Always verify auth** — every API endpoint except /health and /auth/* needs requireAuth
3. **Never delete drafts or feedback** — these are permanent history
4. **Agent runs are async** — always update stage status immediately, never make the HTTP request wait for Claude to respond
5. **Context service always runs fresh** — never cache agent context between runs
6. **One active skill per agent type** — enforce this when activating a skill in DB
