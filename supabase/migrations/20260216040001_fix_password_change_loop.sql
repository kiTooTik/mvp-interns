-- Fix existing profiles that have inconsistent password change flags
-- This migration ensures that first_login and default_password_used are properly synchronized

-- Update existing intern profiles that might have incorrect flag combinations
UPDATE public.profiles 
SET 
  first_login = true,
  default_password_used = true
WHERE 
  user_id IN (
    SELECT user_id FROM public.user_roles WHERE role = 'intern'
  )
  AND (
    first_login IS NULL 
    OR default_password_used IS NULL
    OR first_login = true AND default_password_used = false
    OR first_login = false AND default_password_used = true
  );

-- Ensure all future profiles have consistent defaults
-- (This is handled by the updated column defaults in the previous migration)

-- Add comment to document the intended behavior
COMMENT ON COLUMN public.profiles.first_login IS 'Indicates if user is logging in for the first time. Should be true together with default_password_used to trigger password change.';
COMMENT ON COLUMN public.profiles.default_password_used IS 'Indicates if user is still using the default password set by admin. Should be true together with first_login to trigger password change.';
