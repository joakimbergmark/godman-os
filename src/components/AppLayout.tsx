import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  User,
  Users,
  Activity,
  FileText,
  CheckSquare,
  LogOut,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { GlobalSearch } from "@/components/GlobalSearch";

const items = [
  { title: "Översikt", url: "/dashboard", icon: LayoutDashboard },
  { title: "Tidslinje", url: "/timeline", icon: Clock },
  { title: "Huvudman", url: "/principal", icon: User },
  { title: "Kontakter", url: "/contacts", icon: Users },
  { title: "Aktiviteter", url: "/activities", icon: Activity },
  { title: "Dokument", url: "/documents", icon: FileText },
  { title: "Uppgifter", url: "/tasks", icon: CheckSquare },
] as const;

function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Utloggad");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-semibold truncate">God man</div>
            <div className="text-[11px] text-muted-foreground truncate">Administration</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Meny</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Logga ut</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = items.find((i) => i.url === pathname);
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-border flex items-center gap-3 px-4 sticky top-0 bg-background/90 backdrop-blur z-10 shadow-sm">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold text-foreground truncate hidden sm:block min-w-[100px]">
              {current?.title ?? ""}
            </h1>
            <div className="flex-1 flex justify-center">
              <GlobalSearch />
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
