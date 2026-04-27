-- Add po_core as a valid agent_type for the core identity skill
-- This allows the DB to store an active override for the PO core identity
-- without touching the 4 stage-specific skill entries

ALTER TABLE agent_skills
  MODIFY COLUMN agent_type
    ENUM('po_core', 'ideation', 'research', 'ba', 'scoping')
    NOT NULL;
