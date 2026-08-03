-- Ensure user_permissions.user_id is NOT NULL
-- First, delete any rows with NULL user_id if they exist (shouldn't but just to be safe)
DELETE FROM user_permissions WHERE user_id IS NULL;

-- Add NOT NULL constraint
ALTER TABLE user_permissions
ALTER COLUMN user_id SET NOT NULL;
