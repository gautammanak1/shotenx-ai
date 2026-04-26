/**
 * ASI1 image API (OpenAI-compatible) — POST /v1/image/generate
 * @see https://github.com/gautammanak1/ai-tech-daily-agent style usage with asi1-mini
 */

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function runAsi1ImageTemplate(input: string, agentLabel: string): Promise<Record<string, unknown>> {
  const userPrompt = input.trim() || "Minimal abstract monochrome product hero";
  const apiKey = process.env.ASI_ONE_API_KEY?.trim();
  const base = (process.env.ASI_ONE_BASE_URL?.trim() || "https://api.asi1.ai/v1").replace(/\/$/, "");
  const model = process.env.ASI_IMAGE_MODEL?.trim() || "asi1-mini";
  const fullPrompt = `${agentLabel}: ${userPrompt}`.slice(0, 3200);

  if (!apiKey) {
    return {
      mode: "image",
      prompt: userPrompt,
      note: "Set ASI_ONE_API_KEY to use ASI1 /image/generate.",
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(userPrompt.slice(0, 40))}/768/768`,
    };
  }

  try {
    const res = await fetch(`${base}/image/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        size: "1024x1024",
        model,
      }),
    });

    const rawText = await res.text();
    type ImgRow = { url?: string; b64_json?: string };
    let result: {
      images?: ImgRow[];
      data?: ImgRow[];
      error?: string;
    } = {};
    try {
      result = JSON.parse(rawText) as typeof result;
    } catch {
      return {
        mode: "image",
        prompt: userPrompt,
        note: `ASI image HTTP ${res.status}`,
        error: rawText.slice(0, 400),
      };
    }

    if (!res.ok) {
      return {
        mode: "image",
        prompt: userPrompt,
        note: `ASI image error (${res.status})`,
        error: result.error ?? rawText.slice(0, 300),
      };
    }

    const row = result.data?.[0] ?? result.images?.[0];
    const url = row?.url;
    const b64 = row?.b64_json?.trim();

    if (b64) {
      const mime = b64.startsWith("/9j/") ? "image/jpeg" : "image/png";
      const imageDataUrl = `data:${mime};base64,${b64}`;
      return {
        mode: "image",
        prompt: userPrompt,
        imageDataUrl,
        imageUrl: imageDataUrl,
        meta: { provider: "asi1-image", model, encoding: "b64_json" },
      };
    }

    if (url && url.startsWith("data:image/")) {
      return {
        mode: "image",
        prompt: userPrompt,
        imageDataUrl: url,
        imageUrl: url,
        meta: { provider: "asi1-image", model },
      };
    }
    if (url && /^https?:\/\//i.test(url)) {
      return {
        mode: "image",
        prompt: userPrompt,
        imageUrl: url,
        meta: { provider: "asi1-image", model },
      };
    }

    return {
      mode: "image",
      prompt: userPrompt,
      note: "ASI response had no usable image (no url or b64_json)",
      error: JSON.stringify(result).slice(0, 400),
    };
  } catch (e) {
    return {
      mode: "image",
      prompt: userPrompt,
      note: "ASI image request failed",
      error: errMsg(e),
    };
  }
}
