import { NextRequest, NextResponse } from "next/server";

type UAgentClientInstance = {
  createUserBridge: (seed: string, token?: string) => Promise<unknown>;
  query: (
    agentAddress: string,
    query: string
  ) => Promise<{ success: boolean; response?: string; error?: unknown }>;
};

const clientInstances = new Map<string, UAgentClientInstance>();

const normalizeError = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

async function getClient(seed: string, token: string) {
  if (!clientInstances.has(seed)) {
    const UAgentClientModule = await import("uagent-client");
    const UAgentClient = UAgentClientModule.default || UAgentClientModule;

    const bridgePort = Number(process.env.UAGENT_BRIDGE_PORT ?? 8000);
    const config: {
      timeout: number;
      autoStartBridge: boolean;
      userSeed: string;
      agentverseToken: string;
      bridgePort?: number;
    } = {
      timeout: 60000,
      autoStartBridge: true,
      userSeed: seed,
      agentverseToken: token
    };

    if (Number.isFinite(bridgePort) && bridgePort > 0) {
      config.bridgePort = bridgePort;
    }

    const client = new (UAgentClient as any)(config) as UAgentClientInstance;
    if (token) {
      await client.createUserBridge(seed, token);
    }
    clientInstances.set(seed, client);
  }

  return clientInstances.get(seed)!;
}

export async function POST(request: NextRequest) {
  try {
    const { message, agentAddress, userSeed, agentverseToken } =
      (await request.json()) as {
        message?: string;
        agentAddress?: string;
        userSeed?: string;
        agentverseToken?: string;
      };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    if (!agentAddress || typeof agentAddress !== "string") {
      return NextResponse.json(
        { error: "Invalid agentAddress" },
        { status: 400 }
      );
    }

    const seed = userSeed || process.env.UAGENT_DEFAULT_SEED || "frontend";
    const token = agentverseToken || process.env.AGENTVERSE_TOKEN || "";

    const client = await getClient(seed, token);
    const result = await client.query(agentAddress, message);

    if (result.success) {
      return NextResponse.json({
        response: result.response,
        success: true
      });
    }

    return NextResponse.json(
      {
        response: "Agent could not process this request right now.",
        success: false,
        error: normalizeError(result.error, "agent_query_failed")
      },
      { status: 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        response: "An error occurred while processing your request.",
        error: normalizeError(error, "Unknown error")
      },
      { status: 500 }
    );
  }
}
