-- Check if any admin exists (for one-time setup flow). Safe to call unauthenticated.
CREATE OR REPLACE FUNCTION public.has_any_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin' LIMIT 1);
$$;

-- Assign admin role to the given user only if no admin exists yet (first-time setup).
CREATE OR REPLACE FUNCTION public.ensure_first_admin(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin' LIMIT 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'An admin already exists');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;
