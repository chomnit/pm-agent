-- Migration 004: Add stage_diagrams table
-- Stores AI-generated process diagrams linked to a specific stage draft

CREATE TABLE stage_diagrams (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  draft_id      CHAR(36)     NOT NULL,
  diagram_type  VARCHAR(50)  NOT NULL,
  title         VARCHAR(255) NOT NULL,
  html_content  LONGTEXT     NOT NULL,
  generated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_stagediag_draft FOREIGN KEY (draft_id)
    REFERENCES stage_drafts(id) ON DELETE CASCADE
);

CREATE INDEX idx_diagrams_draft ON stage_diagrams(draft_id);
