-- Diagnostic Query: User Roles vs Profiles Analysis
-- Run this in Supabase SQL Editor to understand the discrepancy

-- 1. Count of intern roles vs intern profiles
SELECT 
  'Intern Roles' as table_name,
  COUNT(*) as record_count
FROM user_roles 
WHERE role = 'intern'

UNION ALL

SELECT 
  'Intern Profiles' as table_name,
  COUNT(*) as record_count
FROM profiles p
JOIN user_roles ur ON p.user_id = ur.user_id
WHERE ur.role = 'intern'

UNION ALL

SELECT 
  'Auth Users with Intern Role' as table_name,
  COUNT(*) as record_count
FROM auth.users au
JOIN user_roles ur ON au.id = ur.user_id
WHERE ur.role = 'intern';

-- 2. Find orphaned user_roles (user_roles without profiles)
SELECT 
  'Orphaned User Roles' as issue_type,
  COUNT(*) as count,
  'user_roles without corresponding profiles' as description
FROM user_roles ur
LEFT JOIN profiles p ON ur.user_id = p.user_id
WHERE ur.role = 'intern' 
  AND p.user_id IS NULL

UNION ALL

-- 3. Find orphaned profiles (profiles without user_roles)
SELECT 
  'Orphaned Profiles' as issue_type,
  COUNT(*) as count,
  'profiles without corresponding user_roles' as description
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE ur.user_id IS NULL

UNION ALL

-- 4. Find orphaned auth users (auth.users without profiles)
SELECT 
  'Orphaned Auth Users' as issue_type,
  COUNT(*) as count,
  'auth.users without corresponding profiles' as description
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;

-- 5. Detailed view of orphaned user_roles
SELECT 
  ur.user_id,
  ur.created_at as role_created_at,
  'ORPHANED' as status
FROM user_roles ur
LEFT JOIN profiles p ON ur.user_id = p.user_id
WHERE ur.role = 'intern' 
  AND p.user_id IS NULL
ORDER BY ur.created_at DESC
LIMIT 20;

-- 6. Detailed view of valid intern records
SELECT 
  p.user_id,
  p.full_name,
  p.email,
  p.department,
  p.created_at as profile_created_at,
  ur.created_at as role_created_at,
  'VALID' as status
FROM profiles p
JOIN user_roles ur ON p.user_id = ur.user_id
WHERE ur.role = 'intern'
ORDER BY p.created_at DESC;
