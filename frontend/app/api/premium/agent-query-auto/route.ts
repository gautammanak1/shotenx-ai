export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const endpoint = new URL("/api/premium/agent-query", req.url).toString();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body
    });

    const passthroughText = await response.text();
    return new Response(passthroughText, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "auto_payment_failed";
    return Response.json(
      {
        error: message,
        hint: "Auto route now proxies paid challenge. Complete payment from connected wallet in client."
      },
      { status: 502 }
    );
  }
}
