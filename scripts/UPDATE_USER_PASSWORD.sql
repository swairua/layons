-- Check if user exists
SELECT id, email, email_confirmed_at, created_at, last_sign_in_at
FROM auth.users
WHERE email = 'info@construction.com';

-- Update user password (run this if user exists above)
-- NOTE: This requires using the Supabase dashboard or admin API
-- Direct password update is not available via SQL in Supabase RLS

-- Alternative: Check in profiles table
SELECT id, email, full_name, role, status
FROM profiles
WHERE email = 'info@construction.com';

-- Update profile if needed
UPDATE profiles
SET updated_at = NOW()
WHERE email = 'info@construction.com'
RETURNING *;
