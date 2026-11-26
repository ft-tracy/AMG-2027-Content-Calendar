ALTER TABLE public.calendar_events
  ADD COLUMN attendee_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

GRANT INSERT ON public.calendar_events TO authenticated;
CREATE POLICY "team creates calendar events" ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE TABLE public.event_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  scheduled_time time,
  kind text NOT NULL CHECK (kind IN ('live_coverage', 'setup', 'teardown')),
  title text NOT NULL,
  platform text CHECK (platform IS NULL OR platform IN ('Instagram', 'Facebook', 'TikTok', 'YouTube')),
  assignee_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  completed boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_deliverables TO authenticated;
GRANT ALL ON public.event_deliverables TO service_role;
ALTER TABLE public.event_deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads event deliverables" ON public.event_deliverables
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team creates event deliverables" ON public.event_deliverables
  FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "team updates event deliverables" ON public.event_deliverables
  FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "team deletes event deliverables" ON public.event_deliverables
  FOR DELETE TO authenticated USING (public.is_team_member(auth.uid()));
CREATE INDEX event_deliverables_event_date_idx ON public.event_deliverables (event_id, scheduled_date, scheduled_time);

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