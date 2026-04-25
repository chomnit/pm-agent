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

export type AgentType = 'po_core' | 'analysis'

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
export type StageType      = 'analysis'
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
  reviewNotes: string | null
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

// ─── Diagrams ────────────────────────────────────────────────────
export interface StageDiagram {
  id: string
  draftId: string
  diagramType: string
  title: string
  htmlContent: string
  generatedAt: string
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
