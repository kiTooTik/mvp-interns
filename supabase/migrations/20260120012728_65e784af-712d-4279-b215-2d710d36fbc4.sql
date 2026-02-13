-- Create app_role enum for role management
CREATE TYPE public.app_role AS ENUM ('admin', 'intern');

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    required_hours INTEGER,
    remaining_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create invite_links table for intern registration
CREATE TABLE public.invite_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    email TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    time_in TIMESTAMP WITH TIME ZONE NOT NULL,
    time_out TIMESTAMP WITH TIME ZONE,
    total_hours NUMERIC(5, 2),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, date)
);

-- Create correction_requests table
CREATE TABLE public.correction_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT NOT NULL,
    requested_time_out TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create allowance_periods table
CREATE TABLE public.allowance_periods (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create allowance_summaries table
CREATE TABLE public.allowance_summaries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    period_id UUID NOT NULL REFERENCES public.allowance_periods(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    days_attended INTEGER NOT NULL DEFAULT 0,
    total_hours NUMERIC(6, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (period_id, user_id)
);

-- Create audit_logs table for tracking sensitive actions
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'admin')
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowance_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Profiles can be inserted during registration" ON public.profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE USING (public.is_admin(auth.uid()));

-- User roles policies
CREATE POLICY "Users can view their own role" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert roles" ON public.user_roles
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update roles" ON public.user_roles
    FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete roles" ON public.user_roles
    FOR DELETE USING (public.is_admin(auth.uid()));

-- Invite links policies
CREATE POLICY "Admins can view invite links" ON public.invite_links
    FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create invite links" ON public.invite_links
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update invite links" ON public.invite_links
    FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete invite links" ON public.invite_links
    FOR DELETE USING (public.is_admin(auth.uid()));

-- Attendance policies
CREATE POLICY "Users can view their own attendance" ON public.attendance
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own attendance" ON public.attendance
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own attendance time_out only" ON public.attendance
    FOR UPDATE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete attendance" ON public.attendance
    FOR DELETE USING (public.is_admin(auth.uid()));

-- Correction requests policies
CREATE POLICY "Users can view their own correction requests" ON public.correction_requests
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create their own correction requests" ON public.correction_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update correction requests" ON public.correction_requests
    FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete correction requests" ON public.correction_requests
    FOR DELETE USING (public.is_admin(auth.uid()));

-- Allowance periods policies
CREATE POLICY "Everyone can view allowance periods" ON public.allowance_periods
    FOR SELECT USING (true);

CREATE POLICY "Admins can create allowance periods" ON public.allowance_periods
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update allowance periods" ON public.allowance_periods
    FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete allowance periods" ON public.allowance_periods
    FOR DELETE USING (public.is_admin(auth.uid()));

-- Allowance summaries policies
CREATE POLICY "Users can view their own allowance summaries" ON public.allowance_summaries
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can create allowance summaries" ON public.allowance_summaries
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update allowance summaries" ON public.allowance_summaries
    FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete allowance summaries" ON public.allowance_summaries
    FOR DELETE USING (public.is_admin(auth.uid()));

-- Audit logs policies (only admins can view)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);