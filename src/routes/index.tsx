import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, ShieldCheck } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/amg-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in · AMG Content Calendar 2027" },
      { name: "description", content: "Sign in with your Google account to plan, approve and track AMG marketing content." },
      { property: "og:title", content: "AMG Content Calendar 2027" },
      { property: "og:description", content: "Plan, approve and track AMG marketing content in one place." },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/dashboard", replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => { if (session) navigate({ to: "/dashboard", replace: true }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function google() {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { toast.error("Google sign-in failed. Please try again."); setBusy(false); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-8 py-12 sm:px-16">
        <img src={logo} alt="AMG" className="h-16 w-auto self-start" />
        <h1 className="mt-10 font-display text-3xl font-bold text-foreground">Content Calendar 2027</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">Sign in with your work Google account to plan posts, upload content for approval and tick off tasks.</p>
        <button onClick={google} disabled={busy} className="mt-8 inline-flex h-11 max-w-sm items-center justify-center gap-[10px] rounded-md border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F] transition hover:shadow-md disabled:opacity-60">
          <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
        <p className="mt-4 text-xs text-muted-foreground">Only signed-in AMG team members can see the calendar.</p>
      </div>
      <div className="hidden flex-col justify-center gap-6 bg-primary px-16 text-primary-foreground lg:flex">
        {[
          [CalendarDays, "One shared calendar", "Every post for Instagram, Facebook, TikTok and YouTube in one view."],
          [ShieldCheck, "Manager approval gate", "Nothing goes live until a Director or the Marketing Manager approves it."],
          [CheckCircle2, "Tick off & stay on time", "See what's overdue and what's coming up this week."],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof CalendarDays;
          return (
            <div key={t as string} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15"><I className="h-5 w-5" /></div>
              <div><div className="font-display text-lg font-medium">{t as string}</div><div className="text-sm opacity-80">{d as string}</div></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
