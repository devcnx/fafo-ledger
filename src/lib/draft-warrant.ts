import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { FIND_OUT_SUGGESTIONS } from "@/lib/constants";
import type { Severity } from "@/lib/types";

const input = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  impact: z.string().max(2000).optional(),
  category: z.string().min(1).max(80),
  severity: z.number().int().min(1).max(5),
  repeatCount: z.number().int().min(1).max(30).optional(),
  parole: z.boolean().optional(),
});

export const draftWarrant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    const sev = data.severity as Severity;
    const fallback = FIND_OUT_SUGGESTIONS[sev][0];
    if (!apiKey) {
      return {
        ok: false as const,
        error: "Grok Is Not Available Here. Using The Stock Sentence.",
        title: fallback.title,
        body: fallback.body,
        dueDays: fallback.dueDays,
      };
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 280,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You write Find Out sentences for a couple's FAFO ledger. Title Case every heading-like phrase. Be specific, enforceable, and short. No slurs. No therapy-speak. Return ONLY JSON: {\"title\":\"...\",\"body\":\"...\",\"dueDays\":number}. dueDays is 1-14.",
          },
          {
            role: "user",
            content: JSON.stringify({
              title: data.title,
              description: data.description,
              impact: data.impact ?? "",
              category: data.category,
              severity: data.severity,
              repeatCount: data.repeatCount ?? 1,
              parole: Boolean(data.parole),
            }),
          },
        ],
      }),
    });

    if (!res.ok) {
      return {
        ok: false as const,
        error: `Grok Could Not Draft This (${res.status}). Using The Stock Sentence.`,
        title: fallback.title,
        body: fallback.body,
        dueDays: fallback.dueDays,
      };
    }

    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    try {
      const parsed = JSON.parse(jsonMatch?.[0] ?? text) as {
        title?: string;
        body?: string;
        dueDays?: number;
      };
      const title = String(parsed.title ?? fallback.title).slice(0, 200);
      const foBody = String(parsed.body ?? fallback.body).slice(0, 2000);
      const dueDays = Math.min(14, Math.max(1, Number(parsed.dueDays) || fallback.dueDays));
      return { ok: true as const, title, body: foBody, dueDays };
    } catch {
      return {
        ok: false as const,
        error: "Grok Sent Gibberish. Using The Stock Sentence.",
        title: fallback.title,
        body: fallback.body,
        dueDays: fallback.dueDays,
      };
    }
  });
