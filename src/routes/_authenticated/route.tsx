import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckSquare, LayoutDashboard, LogOut, Menu, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useMe, useTasks, useTeam } from "@/lib/amg-data";
import logo from "@/assets/amg-logo.png";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
  },
  component: Shell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Content Calendar", icon: CalendarDays },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/approvals", label: "Approvals", icon: ShieldCheck },
  { to: "/team", label: "Team", icon: Users },
] as const;

function Shell() {
  const [open, setOpen] = useState(false);
  const { data: me } = useMe();
  const { data: team = [] } = useTeam();
  const { data: tasks = [] } = useTasks();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = team.find((t) => t.id === me?.id);
  const pending = tasks.filter((t) => t.status === "pending_review").length;

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (me && me.roles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <h1 className="font-display text-xl font-bold text-primary">Waiting for access</h1>
          <p className="mt-2 text-sm text-muted-foreground">You're signed in as {me.email}. Ask a Director or the Marketing Manager to give you access on the Team page, then refresh.</p>
          <button onClick={signOut} className="mt-6 rounded-md border px-4 py-2 text-sm">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-sidebar transition-transform lg:static lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <img src={logo} alt="AMG" className="h-8 w-auto" />
          <div className="leading-tight"><div className="font-display text-sm font-bold text-primary">Content Calendar</div><div className="text-[11px] text-muted-foreground">2027</div></div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Workspace</div>
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
              <Icon className="h-4 w-4" />{label}
              {to === "/approvals" && pending > 0 && <span className="ml-auto rounded-full bg-primary px-2 text-xs text-primary-foreground">{pending}</span>}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{(profile?.full_name ?? "?").slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{profile?.full_name}</div><div className="truncate text-xs text-muted-foreground">{profile?.job_title || ROLE_LABEL[me?.roles.find((r) => r !== "member") ?? "member"]}</div></div>
            <button onClick={signOut} className="rounded p-1.5 text-muted-foreground hover:bg-muted" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <img src={logo} alt="AMG" className="h-7 w-auto" />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

