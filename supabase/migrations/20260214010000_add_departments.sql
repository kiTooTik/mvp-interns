-- Create department enum for categorizing interns (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'department') THEN
    CREATE TYPE public.department AS ENUM (
      'IT', 'HR', 'Software Development', 'Marketing', 'Finance',
      'Operations', 'Design', 'Sales', 'Customer Support', 'Other'
    );
  END IF;
END $$;

-- Add department column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department department DEFAULT 'Other';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_password_used BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;

-- Create departments table for managing department info
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name department NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default departments (ignore if already present)
INSERT INTO public.departments (name, description) VALUES
    ('IT', 'Information Technology Department'),
    ('HR', 'Human Resources Department'),
    ('Software Development', 'Software Development Team'),
    ('Marketing', 'Marketing and Communications'),
    ('Finance', 'Finance and Accounting'),
    ('Operations', 'Operations Management'),
    ('Design', 'Design and Creative Services'),
    ('Sales', 'Sales and Business Development'),
    ('Customer Support', 'Customer Support Services'),
    ('Other', 'Other Departments')
ON CONFLICT (name) DO NOTHING;

-- Create trigger for updated_at on departments table
DROP TRIGGER IF EXISTS update_departments_updated_at ON public.departments;
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on departments table
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Departments policies
DROP POLICY IF EXISTS "Everyone can view departments" ON public.departments;
CREATE POLICY "Everyone can view departments" ON public.departments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments" ON public.departments
    FOR ALL USING (public.is_admin(auth.uid()));

-- Update profiles policies to include department and password fields
DROP POLICY IF EXISTS "Users can view profiles by department" ON public.profiles;
CREATE POLICY "Users can view profiles by department" ON public.profiles
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update department field" ON public.profiles;
CREATE POLICY "Admins can update department field" ON public.profiles
    FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update password fields" ON public.profiles;
CREATE POLICY "Admins can update password fields" ON public.profiles
    FOR UPDATE USING (public.is_admin(auth.uid()));

-- Create index on department for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_first_login ON public.profiles(first_login);
