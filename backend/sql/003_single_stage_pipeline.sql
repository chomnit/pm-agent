-- Migration 003: Collapse 4-stage pipeline into single 'analysis' stage
-- Run this AFTER backing up your data.
-- Steps are ordered: data migration FIRST, then schema changes.

-- ─── Step 1: Migrate existing data before ENUM changes ───────────────────────

-- Keep only one stage_row per ticket (the first one), then update its type
-- Delete extra stage rows (research, ba, scoping) since we only need one
DELETE FROM ticket_stages WHERE stage_type IN ('research', 'ba', 'scoping');

-- Rename remaining 'ideation' rows to 'analysis' — must temporarily allow it
ALTER TABLE ticket_stages MODIFY COLUMN stage_type VARCHAR(20) NOT NULL;
UPDATE ticket_stages SET stage_type = 'analysis' WHERE stage_type = 'ideation';

-- Fix current_stage on tickets
ALTER TABLE tickets MODIFY COLUMN current_stage VARCHAR(20) NULL;
UPDATE tickets SET current_stage = 'analysis' WHERE current_stage IN ('ideation', 'research', 'ba', 'scoping');
UPDATE tickets SET current_stage = NULL WHERE current_stage IS NOT NULL AND current_stage NOT IN ('analysis');

-- Clean up org_knowledge_agent_map — delete old type rows, they can be re-mapped manually
ALTER TABLE org_knowledge_agent_map MODIFY COLUMN agent_type VARCHAR(20) NOT NULL;
DELETE FROM org_knowledge_agent_map WHERE agent_type IN ('ideation', 'research', 'ba', 'scoping');

-- Clean up agent_skills for old stage types
ALTER TABLE agent_skills MODIFY COLUMN agent_type VARCHAR(20) NOT NULL;
DELETE FROM agent_skills WHERE agent_type IN ('ideation', 'research', 'ba', 'scoping');

-- ─── Step 2: Apply new ENUM constraints ──────────────────────────────────────

ALTER TABLE ticket_stages
  MODIFY COLUMN stage_type ENUM('analysis') NOT NULL;

ALTER TABLE tickets
  MODIFY COLUMN current_stage ENUM('analysis') NULL;

ALTER TABLE agent_skills
  MODIFY COLUMN agent_type ENUM('po_core', 'analysis') NOT NULL;

ALTER TABLE org_knowledge_agent_map
  MODIFY COLUMN agent_type ENUM('analysis') NOT NULL;

-- ─── Verification queries (run manually to confirm) ──────────────────────────
-- SHOW CREATE TABLE ticket_stages;
-- SHOW CREATE TABLE tickets;
-- SHOW CREATE TABLE agent_skills;
-- SHOW CREATE TABLE org_knowledge_agent_map;
-- SELECT DISTINCT stage_type FROM ticket_stages;
-- SELECT DISTINCT current_stage FROM tickets;
