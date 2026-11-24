ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reminder_minutes integer NOT NULL DEFAULT 1440;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_reminder_minutes_positive CHECK (reminder_minutes >= 60);

CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  location text,
  start_date date,
  end_date date,
  start_at timestamptz,
  end_at timestamptz,
  timezone text,
  completed boolean NOT NULL DEFAULT false,
  source_calendar text NOT NULL DEFAULT '9a6825f18d84bd6d8af182414047cd04ed3c339352fe2ae612a1035249de2743@group.calendar.google.com',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_time_shape CHECK (
    (start_date IS NOT NULL AND end_date IS NOT NULL AND start_at IS NULL AND end_at IS NULL)
    OR (start_date IS NULL AND end_date IS NULL AND start_at IS NOT NULL AND end_at IS NOT NULL)
  )
);
GRANT SELECT, UPDATE (completed) ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads imported calendar events" ON public.calendar_events FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team checks off calendar events" ON public.calendar_events FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE INDEX calendar_events_start_date_idx ON public.calendar_events (start_date);
CREATE INDEX calendar_events_start_at_idx ON public.calendar_events (start_at);

CREATE TABLE public.monthly_campaigns (
  month_start date PRIMARY KEY,
  title text NOT NULL,
  monthly_goal text,
  key_message text,
  target_audience text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monthly_campaigns_first_day CHECK (EXTRACT(DAY FROM month_start) = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_campaigns TO authenticated;
GRANT ALL ON public.monthly_campaigns TO service_role;
ALTER TABLE public.monthly_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads monthly campaigns" ON public.monthly_campaigns FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "approvers create monthly campaigns" ON public.monthly_campaigns FOR INSERT TO authenticated WITH CHECK (public.is_approver(auth.uid()));
CREATE POLICY "approvers update monthly campaigns" ON public.monthly_campaigns FOR UPDATE TO authenticated USING (public.is_approver(auth.uid())) WITH CHECK (public.is_approver(auth.uid()));
CREATE POLICY "approvers delete monthly campaigns" ON public.monthly_campaigns FOR DELETE TO authenticated USING (public.is_approver(auth.uid()));

CREATE TABLE public.calendar_event_links (
  task_id uuid PRIMARY KEY REFERENCES public.tasks(id) ON DELETE CASCADE,
  google_event_id text NOT NULL UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.calendar_event_links TO authenticated;
GRANT ALL ON public.calendar_event_links TO service_role;
ALTER TABLE public.calendar_event_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads calendar event links" ON public.calendar_event_links FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));

CREATE TABLE public.calendar_feed_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
GRANT SELECT ON public.calendar_feed_tokens TO authenticated;
GRANT ALL ON public.calendar_feed_tokens TO service_role;
ALTER TABLE public.calendar_feed_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read their calendar feed tokens" ON public.calendar_feed_tokens FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_team_member(auth.uid()));
CREATE INDEX calendar_feed_tokens_user_idx ON public.calendar_feed_tokens (user_id) WHERE revoked_at IS NULL;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  event_key text NOT NULL UNIQUE,
  kind text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT notifications_kind_allowed CHECK (kind IN ('assignment', 'review', 'approved', 'revisions', 'comment', 'deadline'))
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read their notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_team_member(auth.uid()));
CREATE POLICY "users mark their notifications read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_team_member(auth.uid())) WITH CHECK (user_id = auth.uid() AND public.is_team_member(auth.uid()));
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE TABLE public.push_subscriptions (
  endpoint text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  p256dh text NOT NULL,
  auth_secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage their push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid() AND public.is_team_member(auth.uid())) WITH CHECK (user_id = auth.uid() AND public.is_team_member(auth.uid()));
CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions (user_id);

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
    WHERE u.id = _user_id
      AND u.email_confirmed_at IS NOT NULL
      AND lower(split_part(u.email, '@', 2)) = 'amgrealtors.com'
      AND u.raw_app_meta_data ->> 'provider' = 'google'
  )
$$;
REVOKE ALL ON FUNCTION public.is_company_google_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_google_user(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_company_google_user(_user_id)
     AND EXISTS (SELECT 1 FROM public.user_roles AS r WHERE r.user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_approver(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_company_google_user(_user_id)
     AND EXISTS (
       SELECT 1 FROM public.user_roles AS r
       WHERE r.user_id = _user_id AND r.role IN ('director', 'manager', 'admin')
     )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_company_google_user(_user_id)
     AND EXISTS (SELECT 1 FROM public.user_roles AS r WHERE r.user_id = _user_id AND r.role = _role)
$$;

CREATE OR REPLACE FUNCTION public.enforce_amg_google_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS NULL
     OR lower(split_part(NEW.email, '@', 2)) <> 'amgrealtors.com'
     OR NEW.email_confirmed_at IS NULL
     OR NEW.raw_app_meta_data ->> 'provider' <> 'google' THEN
    RAISE EXCEPTION 'Access restricted: please sign in with your @amgrealtors.com work Google account.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER enforce_amg_google_signup
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_amg_google_user();
CREATE TRIGGER enforce_amg_google_user_update
BEFORE UPDATE OF email, email_confirmed_at, raw_app_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_amg_google_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  first_user boolean;
  assigned_role public.app_role;
BEGIN
  IF NOT public.is_company_google_user(NEW.id) THEN
    RAISE EXCEPTION 'Access restricted: please sign in with your @amgrealtors.com work Google account.';
  END IF;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO first_user;
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  IF lower(NEW.email) = 'ai@amgrealtors.com' THEN
    assigned_role := 'admin';
  ELSIF first_user THEN
    assigned_role := 'manager';
  ELSE
    assigned_role := 'member';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "approvers add roles" ON public.user_roles;
CREATE POLICY "approvers add non-admin roles" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_approver(auth.uid()) AND role <> 'admin');
DROP POLICY IF EXISTS "approvers remove roles" ON public.user_roles;
CREATE POLICY "approvers remove non-admin roles" ON public.user_roles FOR DELETE TO authenticated
USING (public.is_approver(auth.uid()) AND role <> 'admin');
DROP POLICY IF EXISTS "team reads roles" ON public.user_roles;
CREATE POLICY "verified team reads roles" ON public.user_roles FOR SELECT TO authenticated
USING (public.is_company_google_user(auth.uid()) AND (user_id = auth.uid() OR public.is_team_member(auth.uid())));

DROP POLICY IF EXISTS "own profile insert" ON public.profiles;
CREATE POLICY "verified own profile insert" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id AND public.is_company_google_user(auth.uid()));
DROP POLICY IF EXISTS "own or approver update profile" ON public.profiles;
CREATE POLICY "verified profile update" ON public.profiles FOR UPDATE TO authenticated
USING (public.is_company_google_user(auth.uid()) AND (auth.uid() = id OR public.is_approver(auth.uid())))
WITH CHECK (public.is_company_google_user(auth.uid()) AND (auth.uid() = id OR public.is_approver(auth.uid())));
DROP POLICY IF EXISTS "team reads profiles" ON public.profiles;
CREATE POLICY "verified team reads profiles" ON public.profiles FOR SELECT TO authenticated
USING (public.is_company_google_user(auth.uid()) AND (id = auth.uid() OR public.is_team_member(auth.uid())));

DROP POLICY IF EXISTS "own comments delete" ON public.comments;
CREATE POLICY "verified own comments delete" ON public.comments FOR DELETE TO authenticated
USING (author_id = auth.uid() AND public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "uploader or approver deletes file" ON public.task_files;
CREATE POLICY "verified uploader or approver deletes file" ON public.task_files FOR DELETE TO authenticated
USING (public.is_team_member(auth.uid()) AND (uploaded_by = auth.uid() OR public.is_approver(auth.uid())));

CREATE OR REPLACE FUNCTION public.notify_task_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient uuid;
  event_kind text;
  event_title text;
  event_message text;
  event_token text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    FOREACH recipient IN ARRAY COALESCE(NEW.assignee_ids, '{}'::uuid[]) LOOP
      INSERT INTO public.notifications (user_id, task_id, event_key, kind, title, message)
      VALUES (recipient, NEW.id, 'assignment:' || NEW.id::text || ':' || recipient::text || ':' || NEW.updated_at::text,
        'assignment', 'Task assigned', NEW.title || ' was assigned to you.')
      ON CONFLICT (event_key) DO NOTHING;
    END LOOP;
    RETURN NEW;
  END IF;

  FOR recipient IN
    SELECT added.user_id
    FROM unnest(COALESCE(NEW.assignee_ids, '{}'::uuid[])) AS added(user_id)
    WHERE NOT (added.user_id = ANY(COALESCE(OLD.assignee_ids, '{}'::uuid[])))
  LOOP
    INSERT INTO public.notifications (user_id, task_id, event_key, kind, title, message)
    VALUES (recipient, NEW.id, 'assignment:' || NEW.id::text || ':' || recipient::text || ':' || NEW.updated_at::text,
      'assignment', 'Task assigned', NEW.title || ' was assigned to you.')
    ON CONFLICT (event_key) DO NOTHING;
  END LOOP;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'pending_review' THEN
      FOR recipient IN
        SELECT r.user_id FROM public.user_roles AS r
        WHERE r.role IN ('director', 'manager', 'admin') AND public.is_company_google_user(r.user_id)
      LOOP
        INSERT INTO public.notifications (user_id, task_id, event_key, kind, title, message)
        VALUES (recipient, NEW.id, 'review:' || NEW.id::text || ':' || recipient::text || ':' || NEW.updated_at::text,
          'review', 'Ready for review', NEW.title || ' was submitted for approval.')
        ON CONFLICT (event_key) DO NOTHING;
      END LOOP;
    ELSIF NEW.status = 'approved' OR NEW.status = 'published' THEN
      FOREACH recipient IN ARRAY COALESCE(NEW.assignee_ids, '{}'::uuid[]) LOOP
        INSERT INTO public.notifications (user_id, task_id, event_key, kind, title, message)
        VALUES (recipient, NEW.id, 'approved:' || NEW.id::text || ':' || recipient::text || ':' || NEW.updated_at::text,
          'approved', CASE WHEN NEW.status = 'published' THEN 'Post published' ELSE 'Post approved' END,
          NEW.title || CASE WHEN NEW.status = 'published' THEN ' was marked published.' ELSE ' was approved.' END)
        ON CONFLICT (event_key) DO NOTHING;
      END LOOP;
    ELSIF NEW.status = 'revisions' THEN
      FOREACH recipient IN ARRAY COALESCE(NEW.assignee_ids, '{}'::uuid[]) LOOP
        INSERT INTO public.notifications (user_id, task_id, event_key, kind, title, message)
        VALUES (recipient, NEW.id, 'revisions:' || NEW.id::text || ':' || recipient::text || ':' || NEW.updated_at::text,
          'revisions', 'Changes requested', 'Changes were requested for ' || NEW.title || '.')
        ON CONFLICT (event_key) DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    FOREACH recipient IN ARRAY COALESCE(NEW.assignee_ids, '{}'::uuid[]) LOOP
      INSERT INTO public.notifications (user_id, task_id, event_key, kind, title, message)
      VALUES (recipient, NEW.id, 'rescheduled:' || NEW.id::text || ':' || recipient::text || ':' || NEW.updated_at::text,
        'assignment', 'Deadline changed', NEW.title || ' has a new deadline.')
      ON CONFLICT (event_key) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_task_activity_after_change
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_activity();

CREATE OR REPLACE FUNCTION public.notify_comment_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient uuid;
  task_title text;
  task_creator uuid;
  task_assignees uuid[];
BEGIN
  SELECT t.title, t.created_by, t.assignee_ids INTO task_title, task_creator, task_assignees
  FROM public.tasks AS t WHERE t.id = NEW.task_id;
  FOR recipient IN
    SELECT DISTINCT people.user_id
    FROM (
      SELECT task_creator AS user_id
      UNION ALL
      SELECT unnest(COALESCE(task_assignees, '{}'::uuid[]))
    ) AS people
    WHERE people.user_id IS NOT NULL AND people.user_id <> NEW.author_id
      AND public.is_company_google_user(people.user_id)
  LOOP
    INSERT INTO public.notifications (user_id, task_id, event_key, kind, title, message)
    VALUES (recipient, NEW.task_id, 'comment:' || NEW.id::text || ':' || recipient::text,
      'comment', 'New task comment', 'A new comment was added to ' || COALESCE(task_title, 'a task') || '.')
    ON CONFLICT (event_key) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_comment_after_insert
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_comment_activity();

CREATE OR REPLACE FUNCTION public.generate_due_task_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inserted_count integer;
BEGIN
  INSERT INTO public.notifications (user_id, task_id, event_key, kind, title, message)
  SELECT recipient.user_id,
         t.id,
         'deadline:' || t.id::text || ':' || recipient.user_id::text || ':' || t.due_date::text,
         'deadline',
         'Upcoming deadline',
         t.title || ' is due ' || to_char(t.due_date, 'Dy, DD Mon HH24:MI') || '.'
  FROM public.tasks AS t
  CROSS JOIN LATERAL unnest(
    CASE WHEN cardinality(COALESCE(t.assignee_ids, '{}'::uuid[])) > 0
      THEN t.assignee_ids ELSE ARRAY[t.created_by] END
  ) AS recipient(user_id)
  WHERE NOT t.completed
    AND t.due_date > now()
    AND t.due_date <= now() + interval '1 hour'
    AND t.due_date - (t.reminder_minutes * interval '1 minute') <= now()
    AND public.is_company_google_user(recipient.user_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications AS existing
      WHERE existing.event_key = 'deadline:' || t.id::text || ':' || recipient.user_id::text || ':' || t.due_date::text
    )
  ON CONFLICT (event_key) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_due_task_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_due_task_notifications() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;
