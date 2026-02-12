-- Create function to automatically update remaining hours when attendance is updated
CREATE OR REPLACE FUNCTION public.update_remaining_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update remaining hours when clocking out (time_out is set)
    IF OLD.time_out IS NULL AND NEW.time_out IS NOT NULL AND NEW.total_hours IS NOT NULL THEN
        UPDATE public.profiles 
        SET 
            remaining_hours = GREATEST(0, remaining_hours - NEW.total_hours),
            updated_at = now()
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to automatically update remaining hours when attendance is updated
CREATE TRIGGER update_remaining_hours_trigger
    AFTER UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_remaining_hours();

-- Create function to recalculate remaining hours from scratch (for admin use)
CREATE OR REPLACE FUNCTION public.recalculate_remaining_hours(_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_worked_hours NUMERIC;
    required_hours NUMERIC;
BEGIN
    -- Get total hours worked from attendance
    SELECT COALESCE(SUM(total_hours), 0) INTO total_worked_hours
    FROM public.attendance 
    WHERE user_id = _user_id 
    AND total_hours IS NOT NULL;
    
    -- Get required hours from profile
    SELECT required_hours INTO required_hours
    FROM public.profiles 
    WHERE user_id = _user_id;
    
    -- Return remaining hours
    RETURN GREATEST(0, required_hours - total_worked_hours);
END;
$$ LANGUAGE plpgsql SET search_path = public;
