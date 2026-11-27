<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Approval rules are enforced in the database (`guard_task_approval` trigger + `is_approver`), not only in the UI, so they can't be bypassed from the browser.
- The first account to sign up is made Marketing Manager automatically; everyone after is a team member until an approver changes their role on the Team page.
- Provision AMG roles only through the deferred auth-user lifecycle trigger after the auth record and Google identity are verified, because provider setup can lag the initial auth write.
- Data is read client-side via the Supabase client with RLS (all signed-in team members share one workspace); signed-in pages live under `src/routes/_authenticated/`.
- Task changes and privileged account actions use authenticated server functions so calendar sync and notification side effects stay authorized and consistent.
- Public calendar subscriptions use revocable, user-scoped opaque tokens so calendar apps can read events without exposing workspace sessions.
- Install support is manifest-only; a dedicated messaging worker handles push so it stays separate from app-shell offline caching.
