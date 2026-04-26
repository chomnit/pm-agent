ALTER TABLE telegram_conversations
  DROP COLUMN project_id,
  ADD COLUMN project_ids JSON NULL;
