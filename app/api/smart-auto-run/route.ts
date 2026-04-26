import { NextResponse } from "next/server";

const backendBase = () => {
  const b = process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/$/, "");
  if (!b) throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  return b;
};

/** Greetings / noise only — do not burn paid agent slots. */
const TRIVIAL_ONLY = /^(hi|hello|hey|hola|namaste|yo|sup|thanks|thank you|ok|okay|bye)\b[!.\s]*$/i;

export async function POST(req: Request) {
  let body: {
    prompt?: string;
    buyerId?: string;
    checkoutId?: string;
    preimage?: string;
    agentId?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const rawPrompt = String(body.prompt ?? "").trim();
  if (!rawPrompt) {
    return NextResponse.json({ error: "empty_prompt" }, { status: 400 });
  }

  if (rawPrompt.length < 12 && TRIVIAL_ONLY.test(rawPrompt)) {
    return NextResponse.json(
      {
        error:
          "Describe a concrete task (topic, format, length). Short greetings are not sent to paid builder agents.",
      },
      { status: 400 },
    );
  }

  let forwardPrompt = rawPrompt;
  const apiKey = process.env.ASI_ONE_API_KEY?.trim();
  if (apiKey && rawPrompt.length < 400) {
    try {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey,
        baseURL: process.env.ASI_ONE_BASE_URL ?? "https://api.asi1.ai/v1",
      });
      const completion = await client.chat.completions.create({
        model: process.env.ASI_ONE_MODEL ?? "asi1",
        messages: [
          {
            role: "system",
            content: [
              "You rewrite user requests for a paid AI worker (writer, coder, or image assistant).",
              "Rules: Output a single JSON object only, no markdown.",
              'Shape: {"instruction":"one clear paragraph with role, audience, deliverable"}',
              'If the user only greets or has no real task, use: {"error":"Ask the user for a specific deliverable (topic, tone, length)."}',
              "Never add hashtags or social spam unless the user explicitly asked for social posts.",
            ].join(" "),
          },
          { role: "user", content: rawPrompt },
        ],
        temperature: 0.15,
        max_tokens: 500,
      });
      let text = completion.choices[0]?.message?.content?.trim() ?? "";
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) text = fence[1].trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as { instruction?: string; error?: string };
      if (parsed?.error && String(parsed.error).trim()) {
        return NextResponse.json({ error: String(parsed.error).trim() }, { status: 400 });
      }
      if (parsed?.instruction && String(parsed.instruction).trim().length > 8) {
        forwardPrompt = String(parsed.instruction).trim();
      }
    } catch {
      /* keep original prompt */
    }
  }

  try {
    const target = `${backendBase()}/api/agents/auto-run`;
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: forwardPrompt,
        buyerId: body.buyerId ?? "web-auto-user",
        checkoutId: body.checkoutId,
        preimage: body.preimage,
        agentId: body.agentId,
      }),
    });
    const ct = res.headers.get("content-type") ?? "application/json";
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "content-type": ct.includes("json") ? "application/json" : ct },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "proxy_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
