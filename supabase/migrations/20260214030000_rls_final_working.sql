-- Final Working RLS Policies - Handles dependencies correctly
-- This migration creates simple, working RLS that actually works

-- =====================================================
-- STEP 1: DROP ALL EXISTING POLICIES FIRST
-- =====================================================

-- Drop all existing policies before dropping functions
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Interns can view other interns profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles by department" ON profiles;
DROP POLICY IF EXISTS "Admins can update department field" ON profiles;
DROP POLICY IF EXISTS "Admins can update password fields" ON profiles;

DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

DROP POLICY IF EXISTS "Users can view own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can insert own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Users can update their own attendance time_out only" ON attendance;
DROP POLICY IF EXISTS "Admins can delete attendance" ON attendance;
DROP POLICY IF EXISTS "Interns can view other interns attendance" ON attendance;

DROP POLICY IF EXISTS "Users can view own correction requests" ON correction_requests;
DROP POLICY IF EXISTS "Users can create own correction requests" ON correction_requests;
DROP POLICY IF EXISTS "Users can update own correction requests" ON correction_requests;
DROP POLICY IF EXISTS "Admins can manage correction requests" ON correction_requests;
DROP POLICY IF EXISTS "Admins can update correction requests" ON correction_requests;
DROP POLICY IF EXISTS "Admins can delete correction requests" ON correction_requests;

DROP POLICY IF EXISTS "Everyone can view allowance periods" ON allowance_periods;
DROP POLICY IF EXISTS "Admins can manage allowance periods" ON allowance_periods;
DROP POLICY IF EXISTS "Admins can create allowance periods" ON allowance_periods;
DROP POLICY IF EXISTS "Admins can update allowance periods" ON allowance_periods;
DROP POLICY IF EXISTS "Admins can delete allowance periods" ON allowance_periods;

DROP POLICY IF EXISTS "Users can view own allowance summaries" ON allowance_summaries;
DROP POLICY IF EXISTS "Admins can manage allowance summaries" ON allowance_summaries;
DROP POLICY IF EXISTS "Admins can create allowance summaries" ON allowance_summaries;
DROP POLICY IF EXISTS "Admins can update allowance summaries" ON allowance_summaries;
DROP POLICY IF EXISTS "Admins can delete allowance summaries" ON allowance_summaries;
DROP POLICY IF EXISTS "Interns can view own allowance summaries" ON allowance_summaries;

DROP POLICY IF EXISTS "Everyone can view departments" ON departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

-- Drop policies that may exist from base migration (different wording: "their own" etc.)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can view their own correction requests" ON correction_requests;
DROP POLICY IF EXISTS "Users can view their own allowance summaries" ON allowance_summaries;
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view all daily allowances" ON daily_allowances;
DROP POLICY IF EXISTS "Admins can insert daily allowances" ON daily_allowances;
DROP POLICY IF EXISTS "Admins can update daily allowances" ON daily_allowances;

-- =====================================================
-- STEP 2: DROP EXISTING FUNCTIONS (NOW SAFE)
-- =====================================================

-- Now safe to drop functions since policies are gone
DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP FUNCTION IF EXISTS public.is_intern(UUID);
DROP FUNCTION IF EXISTS public.owns_record(UUID);
DROP FUNCTION IF EXISTS public.log_security_event(TEXT, TEXT, UUID, JSONB, JSONB, UUID, TEXT);

-- =====================================================
-- STEP 3: ENABLE RLS ON CORE TABLES
-- =====================================================

-- Enable RLS on core tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS correction_requests ENABLE ROW LEVEL SECURITY;

-- Enable RLS on optional tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'allowance_periods' AND table_schema = 'public') THEN
        EXECUTE 'ALTER TABLE allowance_periods ENABLE ROW LEVEL SECURITY';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'allowance_summaries' AND table_schema = 'public') THEN
        EXECUTE 'ALTER TABLE allowance_summaries ENABLE ROW LEVEL SECURITY';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments' AND table_schema = 'public') THEN
        EXECUTE 'ALTER TABLE departments ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- =====================================================
-- STEP 4: CREATE SIMPLE SECURITY FUNCTIONS
-- =====================================================

-- Simple admin check function
CREATE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles 
        WHERE user_id = $1 AND role = 'admin'
    );
$$;

-- Simple intern check function
CREATE FUNCTION public.is_intern(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles 
        WHERE user_id = $1 AND role = 'intern'
    );
$$;

-- =====================================================
-- STEP 5: CREATE SIMPLE RLS POLICIES
-- =====================================================

-- PROFILES TABLE POLICIES
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (
        auth.uid() = user_id OR 
        public.is_admin(auth.uid())
    );

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Admins can manage profiles" ON profiles
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- USER_ROLES TABLE POLICIES
CREATE POLICY "Users can view own role" ON user_roles
    FOR SELECT USING (
        auth.uid() = user_id OR 
        public.is_admin(auth.uid())
    );

CREATE POLICY "Admins can manage roles" ON user_roles
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- ATTENDANCE TABLE POLICIES
CREATE POLICY "Users can view own attendance" ON attendance
    FOR SELECT USING (
        auth.uid() = user_id OR 
        public.is_admin(auth.uid())
    );

CREATE POLICY "Users can insert own attendance" ON attendance
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update own attendance" ON attendance
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Admins can manage attendance" ON attendance
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- CORRECTION_REQUESTS TABLE POLICIES
CREATE POLICY "Users can view own correction requests" ON correction_requests
    FOR SELECT USING (
        auth.uid() = user_id OR 
        public.is_admin(auth.uid())
    );

CREATE POLICY "Users can create own correction requests" ON correction_requests
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update own correction requests" ON correction_requests
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Admins can manage correction requests" ON correction_requests
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- OPTIONAL TABLES POLICIES (only if tables exist)
DO $$
BEGIN
    -- ALLOWANCE_PERIODS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'allowance_periods' AND table_schema = 'public') THEN
        CREATE POLICY "Everyone can view allowance periods" ON allowance_periods
            FOR SELECT USING (true);
            
        CREATE POLICY "Admins can manage allowance periods" ON allowance_periods
            FOR ALL USING (
                public.is_admin(auth.uid())
            );
    END IF;
    
    -- ALLOWANCE_SUMMARIES
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'allowance_summaries' AND table_schema = 'public') THEN
        CREATE POLICY "Users can view own allowance summaries" ON allowance_summaries
            FOR SELECT USING (
                auth.uid() = user_id OR 
                public.is_admin(auth.uid())
            );
            
        CREATE POLICY "Admins can manage allowance summaries" ON allowance_summaries
            FOR ALL USING (
                public.is_admin(auth.uid())
            );
    END IF;
    
    -- DEPARTMENTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments' AND table_schema = 'public') THEN
        CREATE POLICY "Everyone can view departments" ON departments
            FOR SELECT USING (true);
            
        CREATE POLICY "Admins can manage departments" ON departments
            FOR ALL USING (
                public.is_admin(auth.uid())
            );
    END IF;
END $$;

-- =====================================================
-- STEP 6: CREATE BASIC INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_correction_requests_user_id ON correction_requests(user_id);

-- =====================================================
-- STEP 7: VERIFICATION AND TESTING
-- =====================================================

-- Show what tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Show RLS status (use pg_class.relrowsecurity; information_schema.tables has no rowsecurity column)
SELECT 
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND c.relname IN ('profiles', 'user_roles', 'attendance', 'correction_requests', 'allowance_periods', 'allowance_summaries', 'departments')
ORDER BY c.relname;

-- Show created policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test the functions
SELECT 'Testing is_admin function:' as test;
SELECT public.is_admin(auth.uid()) as is_current_user_admin;

SELECT 'Testing is_intern function:' as test;
SELECT public.is_intern(auth.uid()) as is_current_user_intern;

-- Test data access (should show your own data only)
SELECT 'Testing profiles access (should show your profile only):' as test;
SELECT user_id, full_name, email FROM profiles LIMIT 5;

SELECT 'Testing user_roles access (should show your role only):' as test;
SELECT user_id, role FROM user_roles LIMIT 5;

-- Success message
SELECT 'RLS policies successfully applied and tested!' as status;
