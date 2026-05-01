ALTER TABLE users
  ADD COLUMN role ENUM('superadmin', 'admin', 'manager') NOT NULL DEFAULT 'manager'
  AFTER avatar_url;
