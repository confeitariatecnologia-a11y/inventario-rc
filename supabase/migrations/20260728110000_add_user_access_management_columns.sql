-- Add management columns to allow global/local admins and manage-users flag

ALTER TABLE user_accesses
  ADD COLUMN IF NOT EXISTS scope text DEFAULT 'unit' NOT NULL,
  ADD COLUMN IF NOT EXISTS can_manage_users boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS user_accesses_scope_idx ON user_accesses(scope);
CREATE INDEX IF NOT EXISTS user_accesses_can_manage_users_idx ON user_accesses(can_manage_users);

-- Note: to create the first admin, run the INSERT below replacing the email
-- with the Supabase Auth user email already created in the Auth dashboard.

-- INSERT INTO user_accesses (full_name, email, role, scope, can_manage_users, is_active)
-- VALUES ('Admin Global', 'admin@exemplo.com', 'admin', 'global', true, true);
