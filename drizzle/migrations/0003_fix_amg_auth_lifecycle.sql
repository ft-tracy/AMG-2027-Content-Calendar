CREATE OR REPLACE FUNCTION public.enforce_amg_google_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS NULL
     OR lower(split_part(NEW.email, '@', 2)) <> 'amgrealtors.com' THEN
    RAISE EXCEPTION 'Access restricted: please sign in with your @amgrealtors.com work Google account.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_amg_google_user_update ON auth.users;
CREATE TRIGGER enforce_amg_google_user_update
BEFORE UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_amg_google_user();

CREATE OR REPLACE FUNCTION public.is_company_google_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users AS u
    JOIN auth.identities AS i ON i.user_id = u.id
    WHERE u.id = _user_id
      AND u.email_confirmed_at IS NOT NULL
      AND lower(split_part(u.email, '@', 2)) = 'amgrealtors.com'
      AND u.raw_app_meta_data ->> 'provider' = 'google'
      AND i.provider = 'google'
      AND lower(i.identity_data ->> 'email') = lower(u.email)
      AND lower(i.identity_data ->> 'email_verified') = 'true'
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_email text;
  current_user_metadata jsonb;
  first_user boolean;
  assigned_role public.app_role;
BEGIN
  PERFORM pg_advisory_xact_lock(17012591, 23);

  SELECT u.email, u.raw_user_meta_data
    INTO current_email, current_user_metadata
  FROM auth.users AS u
  WHERE u.id = NEW.id;

  IF current_email IS NULL OR NOT public.is_company_google_user(NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      current_user_metadata ->> 'full_name',
      current_user_metadata ->> 'name',
      split_part(current_email, '@', 1)
    ),
    current_email,
    current_user_metadata ->> 'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  IF lower(current_email) = 'ai@amgrealtors.com' THEN
    assigned_role := 'admin';
  ELSE
    SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO first_user;
    IF first_user THEN
      assigned_role := 'manager';
    ELSE
      assigned_role := 'member';
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS provision_verified_company_google_user ON auth.users;
CREATE CONSTRAINT TRIGGER provision_verified_company_google_user
AFTER INSERT OR UPDATE ON auth.users
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();