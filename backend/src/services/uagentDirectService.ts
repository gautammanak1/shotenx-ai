type UAgentClientInstance = {
  createUserBridge: (seed: string, token?: string) => Promise<unknown>;
  query: (
    agentAddress: string,
    query: string
  ) => Promise<{ success: boolean; response?: string; error?: unknown }>;
};

const clientInstances = new Map<string, UAgentClientInstance>();

export const normalizeAgentError = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export async function getDirectClient(seed: string, token: string) {
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

export async function queryUAgentDirect(params: {
  agentAddress: string;
  message: string;
  userSeed?: string;
  agentverseToken?: string;
}): Promise<{ success: boolean; response?: string; error?: string }> {
  const seed = params.userSeed || process.env.UAGENT_DEFAULT_SEED || "frontend";
  const token = params.agentverseToken || process.env.AGENTVERSE_API_KEY || "";
  const client = await getDirectClient(seed, token);
  const result = await client.query(params.agentAddress, params.message);
  if (result.success) {
    return { success: true, response: String(result.response ?? "") };
  }
  return {
    success: false,
    error: normalizeAgentError(result.error, "agent_query_failed")
  };
}
