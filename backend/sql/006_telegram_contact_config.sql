ALTER TABLE telegram_conversations
  ADD COLUMN custom_instruction TEXT NULL,
  ADD COLUMN project_id CHAR(36) NULL,
  ADD COLUMN auto_response TINYINT(1) NOT NULL DEFAULT 0;
