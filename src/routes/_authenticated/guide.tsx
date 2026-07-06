import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/guide")({
  component: GuideLayout,
});

const sections = [
  { url: "/guide", label: "Introduktion", exact: true },
  { url: "/guide/kom-igang", label: "1. Kom igång" },
  { url: "/guide/arbetsflode", label: "2. Dagligt arbetsflöde" },
  { url: "/guide/moduler", label: "3. Moduler i appen" },
  { url: "/guide/redovisningsar", label: "4. Redovisningsår" },
  { url: "/guide/ekonomi", label: "5. Ekonomimodulen" },
  { url: "/guide/vidareutveckling", label: "6. Vidareutveckling" },
];

function GuideLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Användarguide</h1>
        <p className="text-sm text-muted-foreground">
          Kort guide för att komma igång och vidareutveckla appen.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="space-y-1">
          {sections.map((s) => {
            const active = s.exact ? pathname === s.url : pathname === s.url;
            return (
              <Link
                key={s.url}
                to={s.url}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors",
                  active && "bg-muted font-medium text-foreground",
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
        <Card>
          <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
            <Outlet />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
