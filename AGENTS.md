<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Active principal (huvudman) is global context in src/lib/accounting-year.tsx; every principal-owned query must filter on principal_id. A DB trigger fills principal_id on activities/tasks/documents/contacts/case_decisions from case/year — why: multi-principal isolation without per-insert plumbing.
