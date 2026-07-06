import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Loader2, Activity, FileText, Users, CheckSquare, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Hit =
  | { type: "activity"; id: string; title: string; description?: string | null; date?: string | null }
  | { type: "document"; id: string; title: string; category?: string | null; date?: string | null; storage_path: string }
  | { type: "contact"; id: string; name: string; organization?: string | null }
  | { type: "task"; id: string; title: string; status: string }
  | { type: "principal"; id: string; full_name: string };

const escapeIlike = (q: string) => q.replace(/[%_,()]/g, " ").trim();

async function runSearch(raw: string): Promise<Hit[]> {
  const q = escapeIlike(raw);
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const limit = 10;

  const [act, doc, con, tsk, pri] = await Promise.all([
    supabase.from("activities")
      .select("id,title,description,activity_date")
      .or(`title.ilike.${like},description.ilike.${like},category.ilike.${like}`)
      .limit(limit),
    supabase.from("documents")
      .select("id,title,category,document_date,storage_path,file_name,comment")
      .or(`title.ilike.${like},category.ilike.${like},comment.ilike.${like},file_name.ilike.${like}`)
      .limit(limit),
    supabase.from("contacts")
      .select("id,name,organization,email,phone,address,city,notes")
      .or(`name.ilike.${like},organization.ilike.${like},email.ilike.${like},phone.ilike.${like},address.ilike.${like},city.ilike.${like},notes.ilike.${like}`)
      .limit(limit),
    supabase.from("tasks")
      .select("id,title,description,status,priority")
      .or(`title.ilike.${like},description.ilike.${like},status.ilike.${like},priority.ilike.${like}`)
      .limit(limit),
    supabase.from("principal")
      .select("id,full_name,personal_number,email,phone,address,city,notes")
      .or(`full_name.ilike.${like},personal_number.ilike.${like},email.ilike.${like},phone.ilike.${like},address.ilike.${like},city.ilike.${like},notes.ilike.${like}`)
      .limit(limit),
  ]);

  const hits: Hit[] = [];
  (act.data ?? []).forEach((r) => hits.push({ type: "activity", id: r.id, title: r.title, description: r.description, date: r.activity_date }));
  (doc.data ?? []).forEach((r) => hits.push({ type: "document", id: r.id, title: r.title, category: r.category, date: r.document_date ?? null, storage_path: r.storage_path }));
  (con.data ?? []).forEach((r) => hits.push({ type: "contact", id: r.id, name: r.name, organization: r.organization }));
  (tsk.data ?? []).forEach((r) => hits.push({ type: "task", id: r.id, title: r.title, status: r.status }));
  (pri.data ?? []).forEach((r) => hits.push({ type: "principal", id: r.id, full_name: r.full_name }));
  return hits;
}

const STATUS_LABEL: Record<string, string> = { open: "Öppen", in_progress: "Pågår", done: "Klar" };

export function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    if (debounced.trim().length < 2) { setHits([]); return; }
    setLoading(true);
    runSearch(debounced).then((h) => { if (!cancelled) setHits(h); })
      .catch(() => { if (!cancelled) setHits([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  const groups = useMemo(() => {
    return {
      activities: hits.filter((h) => h.type === "activity"),
      contacts: hits.filter((h) => h.type === "contact"),
      documents: hits.filter((h) => h.type === "document"),
      tasks: hits.filter((h) => h.type === "task"),
      principal: hits.filter((h) => h.type === "principal"),
    };
  }, [hits]);

  const close = () => { setOpen(false); setQ(""); };

  const openDocument = async (storage_path: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(storage_path, 60);
    if (error || !data) return toast.error(error?.message ?? "Kunde inte öppna dokumentet");
    window.open(data.signedUrl, "_blank");
  };

  const go = (hit: Hit) => {
    close();
    if (hit.type === "activity") navigate({ to: "/activities", search: { highlight: hit.id } });
    else if (hit.type === "contact") navigate({ to: "/contacts", search: { highlight: hit.id } });
    else if (hit.type === "task") navigate({ to: "/tasks", search: { highlight: hit.id } });
    else if (hit.type === "principal") navigate({ to: "/principal" });
    else if (hit.type === "document") openDocument(hit.storage_path);
  };

  const total = hits.length;
  const showPanel = open && debounced.trim().length >= 2;

  return (
    <div ref={wrapRef} className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          className="pl-10 h-10 text-base"
          placeholder="Sök i allt… (Ctrl/Cmd + K)"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-md border border-border bg-popover text-popover-foreground shadow-lg z-50 max-h-[70vh] overflow-y-auto">
          {total === 0 && !loading && (
            <div className="p-4 text-sm text-muted-foreground text-center">Inga träffar.</div>
          )}
          {groups.activities.length > 0 && (
            <Group title={`Aktiviteter (${groups.activities.length})`} icon={<Activity className="h-3.5 w-3.5" />}>
              {groups.activities.map((h) => h.type === "activity" && (
                <ResultRow key={h.id} onClick={() => go(h)}
                  primary={h.title}
                  secondary={[
                    h.date ? new Date(h.date).toLocaleDateString("sv-SE") : null,
                    h.description ? h.description.slice(0, 80) : null,
                  ].filter(Boolean).join(" · ")}
                />
              ))}
            </Group>
          )}
          {groups.contacts.length > 0 && (
            <Group title={`Kontakter (${groups.contacts.length})`} icon={<Users className="h-3.5 w-3.5" />}>
              {groups.contacts.map((h) => h.type === "contact" && (
                <ResultRow key={h.id} onClick={() => go(h)} primary={h.name} secondary={h.organization ?? ""} />
              ))}
            </Group>
          )}
          {groups.documents.length > 0 && (
            <Group title={`Dokument (${groups.documents.length})`} icon={<FileText className="h-3.5 w-3.5" />}>
              {groups.documents.map((h) => h.type === "document" && (
                <ResultRow key={h.id} onClick={() => go(h)}
                  primary={h.title}
                  secondary={[h.category, h.date ? new Date(h.date).toLocaleDateString("sv-SE") : null].filter(Boolean).join(" · ")}
                />
              ))}
            </Group>
          )}
          {groups.tasks.length > 0 && (
            <Group title={`Uppgifter (${groups.tasks.length})`} icon={<CheckSquare className="h-3.5 w-3.5" />}>
              {groups.tasks.map((h) => h.type === "task" && (
                <ResultRow key={h.id} onClick={() => go(h)} primary={h.title} secondary={STATUS_LABEL[h.status] ?? h.status} />
              ))}
            </Group>
          )}
          {groups.principal.length > 0 && (
            <Group title={`Huvudman (${groups.principal.length})`} icon={<User className="h-3.5 w-3.5" />}>
              {groups.principal.map((h) => h.type === "principal" && (
                <ResultRow key={h.id} onClick={() => go(h)} primary={h.full_name} secondary="" />
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/40">
        {icon}<span>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ResultRow({ primary, secondary, onClick }: { primary: string; secondary?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <div className="text-sm font-medium truncate">{primary}</div>
      {secondary && <div className="text-xs text-muted-foreground truncate">{secondary}</div>}
    </button>
  );
}
