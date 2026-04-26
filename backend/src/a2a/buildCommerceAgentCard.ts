import type { AgentCard } from "@a2a-js/sdk";

export function buildCommerceAgentCard(): AgentCard {
  const port = process.env.A2A_PORT || "41242";
  const publicBase = (process.env.A2A_PUBLIC_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, "");

  return {
    protocolVersion: "0.3.0",
    version: "1.0.0",
    name: "Commerce AP2 Agent",
    description:
      "A2A agent that drafts Agent Payments Protocol (AP2) intent and payment mandates from natural language. Wire signed mandates to your AP2-ready gateway or PSP in production.",
    url: `${publicBase}/a2a/jsonrpc`,
    provider: {
      organization: "ShotenX",
      url: publicBase
    },
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: true
    },
    defaultInputModes: ["text"],
    defaultOutputModes: ["text", "task-status"],
    skills: [
      {
        id: "ap2_checkout",
        name: "AP2 checkout draft",
        description:
          "Produces draft AP2 intent and payment mandates plus gateway next steps from a user purchase or authorization request.",
        tags: ["payments", "AP2", "commerce", "A2A"],
        examples: [
          "Authorize up to $49.99 for a monthly Pro plan at merchant merc_acme.",
          "Create a payment mandate draft for two train tickets under €120.",
          "What is AP2 and how do I connect my payment gateway?"
        ],
        inputModes: ["text"],
        outputModes: ["text", "task-status"]
      }
    ],
    supportsAuthenticatedExtendedCard: false,
    additionalInterfaces: [
      { url: `${publicBase}/a2a/jsonrpc`, transport: "JSONRPC" },
      { url: `${publicBase}/a2a/rest`, transport: "HTTP+JSON" }
    ]
  };
}
