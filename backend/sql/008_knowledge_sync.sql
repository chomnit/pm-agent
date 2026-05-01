-- Knowledge sync sessions: one per sync run triggered by the user
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

-- Knowledge sync proposals: one per feature that has proposed changes
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
