-- Create daily_allowances table for tracking daily allowance payments
CREATE TABLE IF NOT EXISTS public.daily_allowances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 150,
    paid BOOLEAN NOT NULL DEFAULT false,
    paid_date TIMESTAMP WITH TIME ZONE,
    paid_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, date)
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_daily_allowances_updated_at ON public.daily_allowances;
CREATE TRIGGER update_daily_allowances_updated_at
    BEFORE UPDATE ON public.daily_allowances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.daily_allowances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Admins can view all daily allowances" ON public.daily_allowances;
CREATE POLICY "Admins can view all daily allowances"
    ON public.daily_allowances
    FOR SELECT
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert daily allowances" ON public.daily_allowances;
CREATE POLICY "Admins can insert daily allowances"
    ON public.daily_allowances
    FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update daily allowances" ON public.daily_allowances;
CREATE POLICY "Admins can update daily allowances"
    ON public.daily_allowances
    FOR UPDATE
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Interns can view their own daily allowances" ON public.daily_allowances;
CREATE POLICY "Interns can view their own daily allowances"
    ON public.daily_allowances
    FOR SELECT
    USING (auth.uid() = user_id);
