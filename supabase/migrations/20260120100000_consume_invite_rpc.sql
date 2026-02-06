-- RPC to validate invite token, mark it as used, and assign intern role to the user.
-- Called by the app when an invited user completes registration (no edge function needed).
CREATE OR REPLACE FUNCTION public.consume_invite(p_token TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Find valid invite: matching token, not used, not expired
  SELECT id, email INTO v_invite
  FROM public.invite_links
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF v_invite.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired invite');
  END IF;

  -- Mark invite as used
  UPDATE public.invite_links
  SET used_at = now()
  WHERE id = v_invite.id;

  -- Assign intern role (bypasses RLS because SECURITY DEFINER)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'intern'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;
