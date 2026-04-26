"use client";

import { useParams, useSearchParams } from "next/navigation";
import { PaidAgentConversation } from "@/components/paid-agent-conversation";

export default function AgentAddressPage() {
  const params = useParams<{ agentAddress: string }>();
  const searchParams = useSearchParams();
  const agentAddress = decodeURIComponent(params.agentAddress);
  const agentName = searchParams.get("name") ?? "Unknown agent";
  const agentDescription = searchParams.get("description") ?? "No description available.";

  return (
    <main className="min-h-screen bg-background p-6">
      <PaidAgentConversation
        agentAddress={agentAddress}
        agentName={agentName}
        agentDescription={agentDescription}
        embedded={false}
      />
    </main>
  );
}
