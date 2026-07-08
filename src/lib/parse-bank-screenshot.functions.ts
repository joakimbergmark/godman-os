import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1),
});

export type ParsedTxRow = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
};

const SYSTEM_PROMPT = `Du tolkar svenska bankkontoutdrag från skärmbilder. Extrahera varje synlig transaktionsrad. Ignorera saldorader, rubriker och summeringar. Returnera ENDAST giltig JSON med formatet:
{"rows":[{"date":"YYYY-MM-DD","description":"text","amount":123.45,"type":"income"|"expense"}]}
Regler:
- date måste vara ISO (YYYY-MM-DD). Om årtal saknas i bilden, använd innevarande år.
- amount är alltid ett positivt tal (utan tecken, utan valuta).
- type är "expense" för uttag/betalningar/kortköp, "income" för insättningar/löner/återbetalningar.
- description = kort beskrivning från raden (mottagare/beskrivning).
- Returnera tom rows-array om inga transaktioner syns.
Svara med enbart JSON, ingen förklaring.`;

export const parseBankScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY saknas");

    const dataUrl = `data:${data.mimeType};base64,${data.imageBase64}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrahera alla transaktioner från denna bild." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("För många förfrågningar. Försök igen strax.");
      if (res.status === 402) throw new Error("AI-krediter slut. Kontakta administratör.");
      throw new Error(`AI-tjänsten svarade ${res.status}: ${body.slice(0, 200)}`);
    }

    const payload = await res.json();
    const text: string = payload?.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { rows: [] as ParsedTxRow[] };
      parsed = JSON.parse(match[0]);
    }

    const RowsSchema = z.object({
      rows: z.array(
        z.object({
          date: z.string(),
          description: z.string().default(""),
          amount: z.union([z.number(), z.string()]).transform((v) => {
            const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
            return Math.abs(n);
          }),
          type: z.enum(["income", "expense"]),
        }),
      ),
    });
    const result = RowsSchema.safeParse(parsed);
    if (!result.success) return { rows: [] as ParsedTxRow[] };

    const rows = result.data.rows
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(r.amount) && r.amount > 0)
      .map((r) => ({ date: r.date, description: r.description, amount: r.amount, type: r.type }));

    return { rows };
  });
