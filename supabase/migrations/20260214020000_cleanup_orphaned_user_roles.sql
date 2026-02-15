-- Clean up orphaned user_roles records
-- This migration removes user_roles that don't have corresponding profiles

-- First, let's see what we're working with
-- Step 1: Identify orphaned user_roles (user_roles without corresponding profiles)

-- Create a temporary table to store orphaned records for review
CREATE TEMPORARY TABLE orphaned_user_roles AS
SELECT ur.*
FROM user_roles ur
LEFT JOIN profiles p ON ur.user_id = p.user_id
WHERE ur.role = 'intern' 
  AND p.user_id IS NULL;

-- Show the count of orphaned records
-- SELECT COUNT(*) as orphaned_count FROM orphaned_user_roles;

-- Step 2: Remove orphaned user_roles records
-- This will delete user_roles that don't have corresponding profiles
DELETE FROM user_roles 
WHERE role = 'intern' 
  AND user_id IN (
    SELECT ur.user_id
    FROM user_roles ur
    LEFT JOIN profiles p ON ur.user_id = p.user_id
    WHERE ur.role = 'intern' 
      AND p.user_id IS NULL
  );

-- Step 3: Also clean up any auth.users that don't have profiles
-- (This is more aggressive - only run if you're sure)
-- DELETE FROM auth.users 
-- WHERE id IN (
--   SELECT au.id 
--   FROM auth.users au
--   LEFT JOIN profiles p ON au.id = p.user_id
--   LEFT JOIN user_roles ur ON au.id = ur.user_id
--   WHERE p.user_id IS NULL 
--     AND ur.user_id IS NULL
-- );

-- Step 4: Verify the cleanup
-- This query should now show matching counts
SELECT 
  (SELECT COUNT(*) FROM user_roles WHERE role = 'intern') as intern_roles_count,
  (SELECT COUNT(*) FROM profiles p 
   JOIN user_roles ur ON p.user_id = ur.user_id 
   WHERE ur.role = 'intern') as intern_profiles_count;

-- Drop the temporary table
DROP TABLE IF EXISTS orphaned_user_roles;

-- Add comment for documentation
COMMENT ON TABLE user_roles IS 'User roles table - cleaned up orphaned records on 2026-02-14';
