CREATE DATABASE IF NOT EXISTS po_agent_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE po_agent_db;

-- 1. users
CREATE TABLE users (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  google_id   VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  avatar_url  TEXT         NULL,
  role        ENUM('superadmin','admin','manager') NOT NULL DEFAULT 'manager',
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
  id          CHAR(36)                NOT NULL DEFAULT (UUID()),
  project_id  CHAR(36)                NOT NULL,
  user_id     CHAR(36)                NOT NULL,
  role        ENUM('owner','member')  NOT NULL DEFAULT 'member',
  invited_by  CHAR(36)                NULL,
  joined_at   DATETIME                NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- Knowledge sync sessions
CREATE TABLE knowledge_sync_sessions (
  id               CHAR(36)     NOT NULL DEFAULT (UUID()),
  project_id       CHAR(36)     NOT NULL,
  status           ENUM('processing','completed','failed') NOT NULL DEFAULT 'processing',
  ticket_count     INT          NOT NULL DEFAULT 0,
  proposal_count   INT          NOT NULL DEFAULT 0,
  unmatched_count  INT          NOT NULL DEFAULT 0,
  unmatched_tickets JSON        NULL,
  error_message    TEXT         NULL,
  created_by       CHAR(36)     NOT NULL,
  completed_at     DATETIME     NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_kss_project    FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_kss_created_by FOREIGN KEY (created_by)  REFERENCES users(id)
);

-- Knowledge sync proposals
CREATE TABLE knowledge_sync_proposals (
  id               CHAR(36)     NOT NULL DEFAULT (UUID()),
  session_id       CHAR(36)     NOT NULL,
  project_id       CHAR(36)     NOT NULL,
  feature_id       CHAR(36)     NULL,
  feature_name     VARCHAR(255) NOT NULL,
  status           ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  current_snapshot JSON         NULL,
  proposed_changes JSON         NOT NULL,
  field_decisions  JSON         NOT NULL DEFAULT (JSON_OBJECT()),
  matched_tickets  JSON         NOT NULL,
  reasoning        TEXT         NULL,
  confidence       ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
  reviewed_by      CHAR(36)     NULL,
  reviewed_at      DATETIME     NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ksp_session     FOREIGN KEY (session_id)  REFERENCES knowledge_sync_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_ksp_feature     FOREIGN KEY (feature_id)  REFERENCES project_features(id) ON DELETE SET NULL,
  CONSTRAINT fk_ksp_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX idx_kss_project_created  ON knowledge_sync_sessions(project_id, created_at DESC);
CREATE INDEX idx_ksp_session_status   ON knowledge_sync_proposals(session_id, status);
