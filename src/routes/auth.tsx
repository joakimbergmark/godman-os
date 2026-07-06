import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

const emailSchema = z.string().trim().email({ message: "Ogiltig e-postadress" }).max(255);
const passwordSchema = z
  .string()
  .min(8, { message: "Lösenordet måste vara minst 8 tecken" })
  .max(72, { message: "Lösenordet är för långt" });

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handle = async (mode: "signin" | "signup") => {
    const em = emailSchema.safeParse(email);
    const pw = passwordSchema.safeParse(password);
    if (!em.success) return toast.error(em.error.issues[0].message);
    if (!pw.success) return toast.error(pw.error.issues[0].message);

    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: em.data,
          password: pw.data,
        });
        if (error) throw error;
        toast.success("Inloggad");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email: em.data,
          password: pw.data,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Konto skapat – du kan logga in nu");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Något gick fel";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">God man</CardTitle>
          <CardDescription>Logga in för att administrera ditt uppdrag</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="signin">Logga in</TabsTrigger>
              <TabsTrigger value="signup">Skapa konto</TabsTrigger>
            </TabsList>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="namn@exempel.se"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Lösenord</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minst 8 tecken"
                />
              </div>
            </div>

            <TabsContent value="signin" className="mt-4">
              <Button className="w-full" disabled={loading} onClick={() => handle("signin")}>
                {loading ? "Loggar in…" : "Logga in"}
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <Button className="w-full" disabled={loading} onClick={() => handle("signup")}>
                {loading ? "Skapar konto…" : "Skapa konto"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
